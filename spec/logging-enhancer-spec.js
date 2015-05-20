/* global describe, beforeEach, expect, it*/

var counters = {};
var OFF = '-1', TRACE = '0', DEBUG = '1', LOG = '2', INFO = '3', WARN = '4', ERROR = '5';
var dummy = {
    off: function() { counters[OFF]++; },
    trace: function() { counters[TRACE]++; },
    debug: function() { counters[DEBUG]++; },
    log: function() { counters[LOG]++; },
    info: function() { counters[INFO]++; },
    warn: function() { counters[WARN]++; },
    error: function() { counters[ERROR]++; }
};

describe("logging-enhancer", function() {

    var moment, sprintf, enh; // test subject
    
    beforeEach(function resetCounters() {
        moment = require("../bower_components/momentjs/moment.js");
        sprintf = require("../bower_components/sprintf/dist/sprintf.min.js").sprintf;
        enh = new (require("../src/logging-enhancer.js").LoggingEnhancer)(sprintf, moment);
        counters[OFF] = counters[TRACE] = counters[DEBUG] = counters[LOG] = counters[INFO] = counters[WARN] = counters[ERROR] = 0;
    });
    
    it("should log simple strings with various prefix configurations", function() {
        var f_none      = enh.enhanceLogging(dummy.trace, enh.LEVEL.TRACE, 'dummy', {}, 'dddd hh', '');
        var f_both      = enh.enhanceLogging(dummy.trace, enh.LEVEL.TRACE, 'dummy', {}, 'dddd hh', '%s(%s): ');
        var f_date1     = enh.enhanceLogging(dummy.warn, enh.LEVEL.TRACE, 'dummy', {}, 'dddd hh', '%s: ');
        var f_date2     = enh.enhanceLogging(dummy.warn, enh.LEVEL.TRACE, 'dummy', {}, 'dddd hh', '%1$s: ');
        var f_context   = enh.enhanceLogging(dummy.error, enh.LEVEL.TRACE, 'dummy', {}, 'dddd hh', '%2$s: ');
        var f_reversed  = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, 'dddd hh', '%2$s(%1$s): ');
        
        var datestr = moment().format('dddd hh'); // as we can't mock momentjs, let's at least have an hour resolution
        
        expect(f_none("Hello World!"))      .toEqual(["", "Hello World!"]);
        expect(f_both("Hello World!"))      .toEqual([datestr + "(dummy): ", "Hello World!"]);
        expect(f_both("%%"))                .toEqual([datestr + "(dummy): ", "%%"]);
        expect(f_date1("Hello World!"))     .toEqual([datestr + ": ", "Hello World!"]);
        expect(f_date2("Hello World!"))     .toEqual([datestr + ": ", "Hello World!"]);
        expect(f_context("Hello World!"))   .toEqual(["dummy: ", "Hello World!"]);
        expect(f_reversed("Hello World!"))  .toEqual(["dummy(" + datestr + "): ", "Hello World!"]);
        
        expect(counters[TRACE]).toBe(3);
        expect(counters[WARN]).toBe(2);
        expect(counters[ERROR]).toBe(1);
        expect(counters[DEBUG]).toBe(1);
    });
    
    it("should log with sprintf replacements", function() {
        // we're not testing everything here, sprintf already does that
        var f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, '', '');
        
        expect(f("Hello %s!", "World")).toEqual(["", "Hello World!"]);
        expect(f("%s%% %s!", "Hello", "World")).toEqual(["", "Hello% World!"]);
        expect(f("%(second)s %(first)s!", { "first": "World", "second": "Hello" })).toEqual(["", "Hello World!"]);
        
        expect(counters[DEBUG]).toBe(3);
    });
    
    it("should log with extra objects passed to the enhanced logging function", function() {
        var f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, '', '');
        
        expect(f("Hello", "World", "!")).toEqual(["", "Hello", "World", "!"]);
        expect(f("Hello", { World: "!" } )).toEqual(["", "Hello", { World: "!" }]);
        expect(f("Hello", { "World": "!" } )).toEqual(["", "Hello", { "World": "!" }]);
        expect(f("Hello", { "World": ["!"] }, [1, 2, 3] )).toEqual(["", "Hello", { "World": ["!"] }, [1, 2, 3]]);
        
        expect(counters[DEBUG]).toBe(4);
    });
    
    it("should log with combined sprintf placeholders and extra objects", function() {
        var f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, '', '');
        
        expect(f("%s %s!", "Hello", "World", [1,2,3])).toEqual(["", "Hello World!", [1,2,3]]);
        expect(f("%2$s %1$s!", "Hello", "World", { extra: 'object' })).toEqual(["", "World Hello!", { extra: 'object' }]);
        expect(f("%(second)s %(first)s!", { "first": "World", "second": "Hello" }, [1,2,3])).toEqual(["", "Hello World!", [1,2,3]]);
        
        expect(counters[DEBUG]).toBe(3);
    });
    
    it("it should works with moment patterns", function() {
        var f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, '[Quarter] Q', '%s: ');
        expect(f("Hello World!")).toEqual(["Quarter " + moment().quarter() + ": ", "Hello World!"]);
        
        f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, 'dddd, MMMM Do YYYY, h:mm:ss a', '%s: ');
        expect(f("Hello World!")).toEqual([moment().format("dddd, MMMM Do YYYY, h:mm:ss a") + ": ", "Hello World!"]);
        
        f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, 'MMMM', '%s: ');
        expect(f("Hello World!")).toEqual([moment().format("MMMM") + ": ", "Hello World!"]);
        expect(f("Hello World!")).not.toEqual(["moo: ", "Hello World!"]);
        
        moment.locale('en-my', {
            months : [ "moo", "moo", "moo", "moo", "moo", "moo", "moo", "moo", "moo", "moo", "moo", "moo" ]
        });
        
        expect(f("Hello World!")).toEqual(["moo: ", "Hello World!"]);
        
        moment.locale(null);
        
        expect(counters[DEBUG]).toBe(5);
    });
    
    it("should work without sprintf library", function() {
        enh = new (require("../src/logging-enhancer.js").LoggingEnhancer)(undefined, moment);
        
        var f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, 'YYYY', '');
        expect(f("Hello World!")).toEqual([moment().year() + "::[dummy]> ", "Hello World!"]);
        expect(f("%s %s!", "Hello", "World", [1,2,3])).toEqual([moment().year() + "::[dummy]> ", "%s %s!", "Hello", "World", [1,2,3]]);
        
        expect(counters[DEBUG]).toBe(2);
    });
    
    it("should work without moment library", function() {
        enh = new (require("../src/logging-enhancer.js").LoggingEnhancer)(sprintf, undefined);
        
		var dateStr = formatLegacyDatestr();
        
        var f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, 'YYYY', '');
        expect(f("Hello World!")).toEqual(["", "Hello World!"]);
        
        f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, 'YYYY', '%s:');
        expect(f("Hello World!")).toEqual([dateStr + ":", "Hello World!"]);
        
        f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, 'YYYY', '%s:%s:');
        expect(f("Hello World!")).toEqual([dateStr + ":dummy:", "Hello World!"]);
        
        f = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'dummy', {}, '', '%s:%s:');
        expect(f("Hello World!")).toEqual([dateStr + ":dummy:", "Hello World!"]);
        
        expect(counters[DEBUG]).toBe(4);
        
        function formatLegacyDatestr() {
    		var d = new Date();
    		var timeStr = new Date().toTimeString().match(/^([0-9]{2}:[0-9]{2}:[0-9]{2})/)[0];
    		return d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear() + " " + timeStr;
        }
    });
    
    it("should work with simple priorities", function() {
        var config = {
            logLevels: {
                'only_silent': enh.LEVEL.OFF,
                'trace_and_up': enh.LEVEL.TRACE,
                'info_and_up': enh.LEVEL.INFO,
                'only_error': enh.LEVEL.ERROR
            }
        };
        
        /* silent logging */
        var f_trace_on_silent = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'only_silent', config, '', '');
        var f_error_on_silent = enh.enhanceLogging(dummy.debug, enh.LEVEL.ERROR, 'only_silent', config, '', '');
        var f_off_on_silent = enh.enhanceLogging(dummy.debug, enh.LEVEL.OFF, 'only_silent', config, '', '');
        
        expect(f_trace_on_silent("test")).toEqual(null);
        expect(f_error_on_silent("test")).toEqual(null);
        
        expect(counters[DEBUG]).toBe(0);
        expect(counters[TRACE]).toBe(0); // dummy.trace was not enhanced to begin with
        expect(counters[ERROR]).toBe(0); // dummy.error was not enhanced to begin with
        expect(counters[OFF]).toBe(0);
        
        /* logging with context set to trace */
        var f_debug_on_trace = enh.enhanceLogging(dummy.debug, enh.LEVEL.DEBUG, 'trace_and_up', config, '', '');
        var f_trace_on_trace = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'trace_and_up', config, '', '');
        var f_error_on_trace = enh.enhanceLogging(dummy.debug, enh.LEVEL.ERROR, 'trace_and_up', config, '', '');
        var f_off_on_trace = enh.enhanceLogging(dummy.debug, enh.LEVEL.OFF, 'trace_and_up', config, '', '');
        
        expect(f_debug_on_trace("test")).toEqual(["", "test"]);
        expect(f_trace_on_trace("test")).toEqual(["", "test"]);
        expect(f_error_on_trace("test")).toEqual(["", "test"]);
        expect(f_off_on_trace("test")).toEqual(null);
        
        expect(counters[DEBUG]).toBe(3);
        expect(counters[TRACE]).toBe(0);
        expect(counters[ERROR]).toBe(0);
        expect(counters[OFF]).toBe(0);
        
        /* logging with context set to info */
        
        var f_debug_on_info = enh.enhanceLogging(dummy.trace, enh.LEVEL.DEBUG, 'info_and_up', config, '', '');
        var f_info_on_info = enh.enhanceLogging(dummy.trace, enh.LEVEL.INFO, 'info_and_up', config, '', '');
        var f_error_on_info = enh.enhanceLogging(dummy.trace, enh.LEVEL.ERROR, 'info_and_up', config, '', '');
        
        expect(f_debug_on_info("test")).toEqual(null);
        expect(f_info_on_info("test")).toEqual(["", "test"]);
        expect(f_error_on_info("test")).toEqual(["", "test"]);
        
        expect(counters[TRACE]).toBe(2);
        
        /* logging with context set to info */
        
        var f_debug_on_error = enh.enhanceLogging(dummy.log, enh.LEVEL.DEBUG, 'only_error', config, '', '');
        var f_warn_on_error = enh.enhanceLogging(dummy.log, enh.LEVEL.WARN, 'only_error', config, '', '');
        var f_error_on_error = enh.enhanceLogging(dummy.log, enh.LEVEL.ERROR, 'only_error', config, '', '');
        
        expect(f_debug_on_error("test")).toEqual(null);
        expect(f_warn_on_error("test")).toEqual(null);
        expect(f_error_on_error("test")).toEqual(["", "test"]);
        
        expect(counters[LOG]).toBe(1);
    });
    
    it("should work with with global wildcard priority", function() {
        /* missing wildcard should default to TRACE (show everything by default) */
        var config = { 
            logLevels: { 'not_wildcard': enh.LEVEL.WARN }
        };
        
        var f_trace_on_wildcard = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'with_wildcard', config, '', '%2$s'); // default to TRACE
        var f_error_on_wildcard = enh.enhanceLogging(dummy.debug, enh.LEVEL.ERROR, 'with_wildcard', config, '', '%2$s'); // default to TRACE
        var f_trace_on_warn = enh.enhanceLogging(dummy.debug, enh.LEVEL.TRACE, 'not_wildcard', config, '', '%2$s'); // not above WARN
        var f_error_on_warn = enh.enhanceLogging(dummy.debug, enh.LEVEL.ERROR, 'not_wildcard', config, '', '%2$s'); // above WARN
        
        expect(f_trace_on_wildcard("test")).toEqual(["with_wildcard", "test"]);
        expect(f_error_on_wildcard("test")).toEqual(["with_wildcard", "test"]);
        expect(f_trace_on_warn("test")).toEqual(null);
        expect(f_error_on_warn("test")).toEqual(["not_wildcard", "test"]);
        
        expect(counters[DEBUG]).toBe(3);
        
        /* missing wildcard should default to TRACE (show everything by default) */
        config.logLevels['*'] = enh.LEVEL.INFO;
        
        f_trace_on_wildcard = enh.enhanceLogging(dummy.info, enh.LEVEL.TRACE, 'with_wildcard', config, '', '%2$s'); // default to INFO
        f_error_on_wildcard = enh.enhanceLogging(dummy.info, enh.LEVEL.ERROR, 'with_wildcard', config, '', '%2$s'); // default to INFO
        f_trace_on_warn = enh.enhanceLogging(dummy.info, enh.LEVEL.TRACE, 'not_wildcard', config, '', '%2$s'); // not above WARN
        f_error_on_warn = enh.enhanceLogging(dummy.info, enh.LEVEL.ERROR, 'not_wildcard', config, '', '%2$s'); // above WARN
        
        expect(f_trace_on_wildcard("test")).toEqual(null);
        expect(f_error_on_wildcard("test")).toEqual(["with_wildcard", "test"]);
        expect(f_trace_on_warn("test")).toEqual(null);
        expect(f_error_on_warn("test")).toEqual(["not_wildcard", "test"]);
        
        expect(counters[INFO]).toBe(2);
    });
    
    it("should work with nested priorities", function() {
        // leave contexts with '2' out to default back to the parent group (eg. '1.2' -> '1', '2' -> '*)
        var config = { 
            logLevels: { 
                '*': enh.LEVEL.WARN,
                '1': enh.LEVEL.TRACE,
                '1.1': enh.LEVEL.ERROR,
                '1.3': enh.LEVEL.WARN,
                '3': enh.LEVEL.OFF,
                '3.1': enh.LEVEL.WARN
            }
        };
        
        /* test context '1' with three logging thresholds (below, same and above */
        
        var f_off_on_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.OFF, '1', config, '', '%2$s');
        var f_trace_on_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.TRACE, '1', config, '', '%2$s');
        var f_debug_on_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.DEBUG, '1', config, '', '%2$s');
        
        expect(f_off_on_1("test")).toEqual(null);
        expect(f_trace_on_1("test")).toEqual(["1", "test"]);
        expect(f_trace_on_1("test")).toEqual(["1", "test"]);
        
        /* test context '1.1' */
        
        var f_warn_on_1_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.WARN, '1.1', config, '', '%2$s');
        var f_error_on_1_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.ERROR, '1.1', config, '', '%2$s');
        var f_off_on_1_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.OFF, '1.1', config, '', '%2$s');
        
        expect(f_warn_on_1_1("test")).toEqual(null);
        expect(f_error_on_1_1("test")).toEqual(["1.1", "test"]);
        expect(f_off_on_1_1("test")).toEqual(null);
        
        /* test context '1.2', which should default to '1' */
        
        var f_off_on_1_2 = enh.enhanceLogging(dummy.trace, enh.LEVEL.OFF, '1.2', config, '', '%2$s');
        var f_trace_on_1_2 = enh.enhanceLogging(dummy.trace, enh.LEVEL.TRACE, '1.2', config, '', '%2$s');
        var f_debug_on_1_2 = enh.enhanceLogging(dummy.trace, enh.LEVEL.DEBUG, '1.2', config, '', '%2$s');
        
        expect(f_off_on_1_2("test")).toEqual(null);
        expect(f_trace_on_1_2("test")).toEqual(["1.2", "test"]);
        expect(f_debug_on_1_2("test")).toEqual(["1.2", "test"]);
        
        /* test context '1.3' */
        
        var f_info_on_1_3 = enh.enhanceLogging(dummy.trace, enh.LEVEL.INFO, '1.3', config, '', '%2$s');
        var f_warn_on_1_3 = enh.enhanceLogging(dummy.trace, enh.LEVEL.WARN, '1.3', config, '', '%2$s');
        var f_error_on_1_3 = enh.enhanceLogging(dummy.trace, enh.LEVEL.ERROR, '1.3', config, '', '%2$s');
        
        expect(f_info_on_1_3("test")).toEqual(null);
        expect(f_warn_on_1_3("test")).toEqual(["1.3", "test"]);
        expect(f_error_on_1_3("test")).toEqual(["1.3", "test"]);
        
        /* test context '2' which should default to '*' */
        
        var f_info_on_wildcard = enh.enhanceLogging(dummy.trace, enh.LEVEL.INFO, '2', config, '', '%2$s');
        var f_warn_on_wildcard = enh.enhanceLogging(dummy.trace, enh.LEVEL.WARN, '2', config, '', '%2$s');
        var f_error_on_wildcard = enh.enhanceLogging(dummy.trace, enh.LEVEL.ERROR, '2', config, '', '%2$s');
        
        expect(f_info_on_wildcard("test")).toEqual(null);
        expect(f_warn_on_wildcard("test")).toEqual(["2", "test"]);
        expect(f_error_on_wildcard("test")).toEqual(["2", "test"]);
        
        /* test context '3' */
        
        var f_trace_on_3 = enh.enhanceLogging(dummy.trace, enh.LEVEL.TRACE, '3', config, '', '%2$s');
        var f_error_on_3 = enh.enhanceLogging(dummy.trace, enh.LEVEL.ERROR, '3', config, '', '%2$s');
        var f_off_on_3 = enh.enhanceLogging(dummy.trace, enh.LEVEL.OFF, '3', config, '', '%2$s');
        
        expect(f_trace_on_3("test")).toEqual(null);
        expect(f_error_on_3("test")).toEqual(null);
        expect(f_off_on_3("test")).toEqual(null);
        
        /* test context '3.1' */
        
        var f_trace_on_3_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.TRACE, '3.1', config, '', '%2$s');
        var f_error_on_3_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.ERROR, '3.1', config, '', '%2$s');
        var f_off_on_3_1 = enh.enhanceLogging(dummy.trace, enh.LEVEL.OFF, '3.1', config, '', '%2$s');
        
        expect(f_trace_on_3_1("test")).toEqual(null);
        expect(f_error_on_3_1("test")).toEqual(["3.1", "test"]);
        expect(f_off_on_3_1("test")).toEqual(null);
        
        /* test context '3.2', which should default to '3' */
        
        var f_trace_on_3_2 = enh.enhanceLogging(dummy.trace, enh.LEVEL.TRACE, '3.2', config, '', '%2$s');
        var f_error_on_3_2 = enh.enhanceLogging(dummy.trace, enh.LEVEL.ERROR, '3.2', config, '', '%2$s');
        var f_off_on_3_2 = enh.enhanceLogging(dummy.trace, enh.LEVEL.OFF, '3.2', config, '', '%2$s');
        
        expect(f_trace_on_3_2("test")).toEqual(null);
        expect(f_error_on_3_2("test")).toEqual(null);
        expect(f_off_on_3_2("test")).toEqual(null);
    });
});