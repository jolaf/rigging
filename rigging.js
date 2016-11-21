/* jshint strict: global */
/* globals $, document, location, window, CLEAT, SCHEME_WIDTH, SCHEME_HEIGHT, PIN, PORT, STARBOARD, DECKS, LINES, DETAIL_LINE, LINE_DETAIL, SINGULAR, PLURAL, CLEWLINE, BUNTLINE, CLEWBUNTLINES, LEECHLINE, BOWLINE */
"use strict";

function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        alert(message); // jshint ignore:line
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // fallback just in case Error doesn't exist
    }
}

function applyNew(f, args) {
    return new (f.bind.apply(f, [null].concat(args)))();
}

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
};

String.prototype.reEnd = function (suffix, cut) {
    return this.slice(0, cut === 0 ? 0 : -(cut || suffix.length)) + suffix;
};

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

function russianPlural(str) { // Множественное число существительного
    if (str.endsWith('а')) {
        return str.reEnd('ы');
    }
    if (str.endsWith('аль')) {
        return str.reEnd('али');
    }
    if (str.endsWith('ая')) {
        return str.reEnd('ые');
    }
    if (str.endsWith('г')) {
        return str.reEnd('и');
    }
    if (str.endsWith('ь')) {
        return str.reEnd('я');
    }
    return str + 'ы';
}

function russianGenetive(str) { // Родительный падеж существительного
    if (str.endsWith('а')) {
        return str.reEnd('ы');
    }
    if (str.endsWith('нь')) {
        return str.reEnd('ни');
    }
    if (str.endsWith('ь') || str.endsWith('й')) {
        return str.reEnd('я');
    }
    if (str.endsWith('ы')) {
        return str.reEnd('ов', 1);
    }
    if (str.endsWith('ю')) {
        return str;
    }
    return str + 'а';
}

function Point(deck, rail, index, x, y, type, rotation) { // ToDo: Somehow add side (for assymetric lines)
    assert(deck);
    this.deck = deck;
    assert(rail);
    this.rail = rail;
    this.number = index + 1;
    this.x = x;
    this.y = y;
    this.type = type || CLEAT;
    this.rotation = rotation;
    this.line = null;
    Point.points.push(this);
}

Point.points = [];

Point.marks = {};
Point.marks[    CLEWLINE ] = 'clewline';
Point.marks[    BUNTLINE ] = 'buntline';
Point.marks[CLEWBUNTLINES] = 'clewbuntlines';
Point.marks[   LEECHLINE ] = 'leechline';
Point.marks[     BOWLINE ] = 'bowline';

Point.prototype.attachLine = function (line) {
    assert(line);
    assert(!this.line, "Line already attached to " + this.description);
    this.line = line;
};

Point.prototype.toString = function () {
    return 'Point("' + this.deck.name + '", "' + this.rail.name + '", ' + this.number + ', ' + this.x + ', ' + this.y + ', "' + this.type + '", ' + this.rotation + ', ' + (this.line ? this.line.fullName : 'null') + ')';
};

Point.prototype.createElement = function () {
    this.description = this.deck.title.capitalize() + ', ' + this.rail.name + (this.rail.points.length == 1 ? '' : ', №' + this.number); // We can't do it in the constructor, as this.rail has not benn constructed yet as in there
    assert(this.line, "No line for point " + this.description);
    this.icon = $('<img class="point ' + this.type + '" ' + ' alt="" src="images/blank.gif">');
    this.icon.css({
        left: this.x,
        top: this.y, // Must be adjusted for height when visible (in placeElements), here it only works in Firefox
        transform: ((this.y <= -20) ? 'scaleY(-1) ' : '') + 'rotate(' + (this.rotation || 0.01) + 'deg)' // Rotation is needed for drop-shadow to work correctly on mirrored elements in Chrome
    });
    this.element = $('<a class="pointNumber">' + (this.rail.points.length == 1 ? 'I' : this.number) + '</a>');
    this.elements = this.icon.add(this.element);
    var name = this.line.name;
    this.elements.each(function (_index, element) {
        $(element).data('title', name);
    });
    this.elements.on('mouseenter mouseleave', this, function (event) {
        event.data.line.mouseHandler();
    });
    this.elements.on('click', this, Questionary.answerQuestion);
    return this.element;
};

Point.prototype.mouseHandler = function () {
    this.element.toggleClass('on');
    this.icon.toggleClass('on');
};

Point.placeElements = function (location) {
    location = $(location);
    $.each(Point.points, function (_index, point) {
        var icon = point.icon;
        location.append(icon);
        icon.css({
            top: '+=' + (SCHEME_HEIGHT - (parseInt(icon.css('top')) > -20 ? 0 : parseInt(icon.css('height')))), // Could be done in createElement(), but it only works in Firefox
        });
        point.elements.addClass(Point.marks[this.line.lineName]);
    });
};

Point.tooltips = function (enable) {
    $.each(Point.points, function (_index, point) {
        point.elements.each(function (_index, point) {
            point = $(point);
            if (enable) {
                point.attr('title', point.data('title'));
            } else {
                point.removeAttr('title');
            }
        });
    });
};

function Rail(deck, name, assym, x0, y0, stepX, stepY, nPoints, type, rotation) {
       // or (deck, name, assym, x0, x0, [[x, y, type = CLEAT, rotation = 0], ...])
    assert(deck);
    this.deck = deck;
    assert(name, "No rail name");
    this.name = name;
    this.assym = assym || false;
    x0 = x0 || 0;
    y0 = y0 || 0;
    var args;
    if (Array.isArray(stepX)) { // stepX = points = [[x, y, type = CLEAT, rotation = 0], ...]
        args = $.map(stepX, function (args, index) {
            return [[index, x0 + (args[0] || 0), y0 + (args[1] || 0), args[2] || CLEAT, args[3] || 0]]; // $.map flattens arrays
        });
    } else { // stepX, stepY, nPoints, type = PIN, rotation
        args = $.map(Array(nPoints || 1), function (_undefined, index) {
            return [[index, (x0 || 0) + (stepX || 0) * index, (y0 || 0) + (stepY || 0) * index, type || PIN, rotation || 0]]; // $.map flattens arrays
        });
    }
    var prefix = [deck, this];
    this.points = $.map(args, function (args, _index) {
        return applyNew(Point, prefix.concat(args));
    });
    if (!this.assym) {
        this.portPoints = $.map(args, function (args, _index) {
            args[2] *= -1;
            return applyNew(Point, prefix.concat(args));
        });
    } else {
        this.portPoints = [];
    }
    this.lines = [];
}

Rail.prototype.attachLine = function (number, line) {
    assert(line);
    if (!number) {
        number = 1;
    } else if (number < 0) {
        number += this.portPoints.length + 1;
    }
    assert (this.assym ? line.assym == this.assym : (!line.assym || line.assym == PORT || line.assym == STARBOARD), "Line assimmetry " + line.assym + " is not compatible with rail assimetry " + this.assym);
    var point;
    var ret = [];
    if (this.assym || line.assym != PORT) {
        point = this.points[number - 1];
        assert(point);
        point.attachLine(line);
        ret.push(point);
    }
    if (!this.assym && (!line.assym || line.assym == PORT)) {
        point = this.portPoints[number - 1];
        assert(point);
        point.attachLine(line);
        ret.push(point);
    }
    this.lines.push(line);
    line.number = number;
    return ret;
};

Rail.prototype.toString = function () {
    return 'Rail("' + this.deck.name + '", "' + this.name + '", ' + this.points.length + ', ' + this.lines.length + ')';
};

Rail.prototype.createElement = function () {
    var element = $('<li class="rail"><span class="rail">' + this.name + '</span>: <span class="points"></span></li>');
    var points = $('span.points', element);
    $.each(this.portPoints.reverse(), function (_index, point) {
        points.append(point.createElement()).append(' ');
    });
    if (this.portPoints.length) {
        points.append('&nbsp;');
    }
    $.each(this.points, function (_index, point) {
        points.append(' ').append(point.createElement());
    });
    this.element = element;
    return this.element;
};

function Deck(name, title, rails) {
    assert(name, "No deck name");
    this.name = name;
    assert(title, "No deck title");
    this.title = title;
    var uniqueRails = [];
    var deck = this;
    this.rails = $.map(rails, function (railArgs, _index) {
        var rail = applyNew(Rail, [deck,].concat(railArgs));
        assert($.inArray(uniqueRails, rail.name) < 0, "Duplicate rail name: " + deck.name + '/' + rail.name);
        uniqueRails.push(rail.name);
        return rail;
    });
    this.lines = [];
}

Deck.prototype.attachLine = function (railName, number, line) {
    assert(line);
    this.lines.push(line);
    var rails = $.grep(this.rails, function (rail, _index) {
        return railName === rail.name;
    });
    assert(rails.length == 1, "Unknown rail: " + railName);
    return rails[0].attachLine(number, line);
};

Deck.prototype.toString = function () {
    return 'Deck("' + this.name + '", ' + this.rails.length + ', ' + this.lines.length + ')';
};

Deck.prototype.createElement = function () {
    var element =  $('<td class="deck"><h2>' + this.title.capitalize() + '</h2><ul></ul></td>');
    var ul = $('ul', element);
    $.each(this.rails, function (_index, rail) {
        ul.append(rail.createElement());
    });
    this.element = element;
    return this.element;
};

Deck.construct = function () {
    var uniqueNames = [];
    Deck.decks = $.map(DECKS, function (deckArgs, _index) {
        var deck = applyNew(Deck, deckArgs);
        assert($.inArray(uniqueNames, deck.name) < 0, "Duplicate deck name: " + deck.name);
        uniqueNames.push(deck.name);
        return deck;
    });
};

Deck.getDeck = function (deckName) {
    assert(deckName, "No deck");
    var decks = $.grep(Deck.decks, function (deck, _index) {
        return deckName === deck.name;
    });
    assert(decks.length == 1, "Unknown deck: " + deckName);
    return decks[0];
};

Deck.createElements = function () {
    $.each(Deck.decks, function (_index, deck) {
        deck.createElement();
    });
};

Deck.placeElements = function (location) {
    var element = $(location);
    $.each(Deck.decks, function (_index, deck) {
        element.prepend(deck.element);
    });
};

function Line(mastName, sailName, deckName, railName, number, lineName, detail, assym, fullName, pluralName) {
    this.assym = assym || false;
    this.points = Deck.getDeck(deckName).attachLine(railName, number, this); // Also sets this.number
    this.mast = Mast.getMast(mastName);
    this.sail = this.mast.attachLine(sailName, this);
    assert(lineName, "No line");
    this.lineName = lineName;
    this.detail = detail || '';
    fullName = fullName || '';
    var fullNameWords, pluralWords;
    switch (fullName) {
        case DETAIL_LINE:
            fullNameWords = this.detail ? [this.detail, this.lineName] : [this.lineName,];
            pluralWords = $.map(fullNameWords, russianPlural);
            break;
        case LINE_DETAIL:
            fullNameWords = this.detail ? [this.lineName, russianGenetive(this.detail)] : [this.lineName,];
            pluralWords = $.map(fullNameWords.slice(0, 1), russianPlural).concat(fullNameWords.slice(1));
            break;
        case '': // GRAMMAR
            fullNameWords = (this.detail ? [this.detail,] : []).concat([this.lineName,]).concat(this.sail.name || this.mast.name ? [this.sail.name || this.mast.name,] : []);
            fullNameWords = fullNameWords.slice(0, 1).concat($.map(fullNameWords.slice(1), russianGenetive));
            pluralWords = $.map(fullNameWords.slice(0, -1), russianPlural).concat(fullNameWords.slice(-1));
            pluralWords = pluralWords.slice(0, 1).concat($.map(pluralWords.slice(1, -1), russianGenetive)).concat(pluralWords.slice(-1));
            break;
        default:
            pluralWords = fullNameWords = fullName.split(' ');
    }
    assert(fullNameWords, "Empty fullNameWords");
    pluralName = pluralName || '';
    switch (pluralName) {
        case SINGULAR:
        case PLURAL:
        case '': // GRAMMAR
            break; // We'll process it later
        default:
            pluralWords = pluralName.split(' ');
    }
    assert(pluralWords, "Empty pluralWords");
    this.name = fullNameWords.join(' ').capitalize();
    this.pluralName = pluralName === SINGULAR ? this.name : pluralWords.join(' ').capitalize();
    this.name = pluralName === PLURAL ? this.pluralName : this.name;
    if (this.assym) {
        this.pluralName = undefined;
    }
}

Line.prototype.toString = function () {
    return 'Line("' + this.mast.name + '", "' + this.sail.name + '", "' + this.name + '")';
};

Line.prototype.createElement = function () {
    this.element = $('<li class="line">' + (this.pluralName || this.name) + '</li>');
    this.element.on('mouseenter mouseleave', this, function (event) { event.data.mouseHandler(); });
    return this.element;
};

Line.prototype.mouseHandler = function () {
    this.element.toggleClass('on');
    $.each(this.points, function (_index, point) {
        point.mouseHandler();
    });
};

Line.construct = function () {
    var uniqueNames = [];
    Line.lines = [];
    $.each(LINES, function (_index, args) {
        var prefix = [args[0], ''];
        $.each(args[1], function (_index, args) {
            prefix[1] = args[0];
            $.each(args[1], function (_index, args) {
                var line = applyNew(Line, prefix.concat(args));
                assert($.inArray(uniqueNames, line.name) < 0, "Duplicate line name: " + line.name);
                uniqueNames.push(line.name);
                Line.lines.push(line);
            });
        });
    });
};

function Sail(name, mast) {
    this.name = name;
    assert(mast);
    this.mast = mast;
    this.lines = [];
}

Sail.prototype.attachLine = function (line) {
    assert(line);
    this.lines.push(line);
};

Sail.prototype.toString = function () {
    return 'Sail("' + this.mast.name + '", "' + this.name + '", ' + this.lines.length + ')';
};

Sail.prototype.createElement = function () {
    var element = $('<div class="sail"><ul></ul></div>');
    if (this.name ? this.name != this.mast.name : this.mast.sails.length > 1) {
        var name = this.name ? this.name.capitalize() : 'Прочие снасти';
        element.prepend($('<h3>' + name + '</h3>'));
    }
    var ul = $('ul', element);
    $.each(this.lines, function (_index, line) {
        ul.append(line.createElement());
    });
    this.element = element;
    return this.element;
};

function Mast(name) {
    this.name = name;
    this.sails = [];
    this.lines = [];
}

Mast.masts = [];

Mast.getMast = function (mastName) {
    mastName = mastName || '';
    var masts = $.grep(Mast.masts, function (mast, _index) { return mastName === mast.name; });
    var mast;
    if (masts.length) { // == 1
        mast = masts[0];
    } else {
        mast = new Mast(mastName);
        Mast.masts.push(mast);
    }
    return mast;
};

Mast.prototype.attachLine = function (sailName, line) {
    assert(line);
    var sail = new Sail(sailName, this);
    var sails = $.grep(this.sails, function (checkSail, _index) { return sail.name === checkSail.name; });
    if (sails.length) { // == 1
        sail = sails[0];
    } else {
        this.sails.push(sail);
    }
    sail.attachLine(line);
    this.lines.push(line);
    return sail;
};

Mast.prototype.toString = function () {
    return 'Mast("' + this.name + '", ' + this.sails.length + '", ' + this.lines.length + ')';
};

Mast.prototype.createElement = function () {
    var element =  $('<div class="mast"><h2>' + (this.name ? this.name.capitalize() : 'Прочие снасти') + '</h2></div>');
    $.each(this.sails, function (_index, sail) {
        element.append(sail.createElement());
    });
    this.element = element;
    return this.element;
};

Mast.createElements = function () {
    $.each(Mast.masts, function (_index, mast) {
        mast.createElement();
    });
};

Mast.placeElements = function (linesLocation, fullLinesLocation) {
    var fullLinesElement = $(fullLinesLocation);
    var td;
    $.each(Mast.masts, function (index, mast) {
        if ($.inArray(index, [1, Mast.masts.length - 1, Mast.masts.length - 2]) < 0) {
            td = $('<td>');
            fullLinesElement.prepend(td);
        }
        if (index == 1) {
            td.prepend(mast.element);
        } else {
            td.append(mast.element);
        }
    });
};

function onResize() {
    onResize.scheme.hide();
    var scale = $(document).width() / SCHEME_WIDTH;
    onResize.placeholder.css({ height: Math.floor(2 * SCHEME_HEIGHT * scale) });
    onResize.scheme.css({ transform: 'scale(' + scale + ')'}).show();
}

function setMode(mode) {
    mode = mode.trim().toLowerCase() || 'demo';
    if (mode === setMode.mode) {
        return;
    }
    setMode.mode = mode;
    location.href = '#' + mode;
    var input = $('#' + mode + 'Mode input');
    input.prop('checked', true);
    setMode.modeDependent.hide();
    $('.usedInMode' + mode.capitalize()).show();
    $('#rightAnswer, #wrongAnswer, #nextQuestionNote, #statistics').hide();
    switch(mode) {
    case setMode.DEMO:
        setMode.schemeBlock.show();
        break;
    case setMode.WHERE:
    case setMode.WHICH:
        setMode.schemeBlock.toggle($('#toggleScheme')[0].checked);
        break;
    case setMode.INFO:
        setMode.schemeBlock.hide();
        break;
    default:
        setMode(setMode.DEMO);
        return;
    }
    Questionary.askQuestion(mode);
}

setMode.DEMO = 'demo';
setMode.WHERE = 'where';
setMode.WHICH = 'which';
setMode.INFO = 'info';

setMode.mode = null;

function resetDecks() {
    $('.mask').hide();
    $('#selectDecks input').prop('checked', true);
    $('#selectDecks input').prop('disabled', false);
    $('#selectDecks :first-child input').prop('disabled', true);
}

function resetMasts() {
    $('#selectMasts input').prop('checked', true);
    $('#selectMasts input').prop('disabled', false);
    $('#selectMasts :first-child input').prop('disabled', true);
}

function menuHandler(event) {
    var selector = $(this); // jshint ignore:line
    var input = selector.find('input');
    if (this === event.target) { // jshint ignore:line
        input.click();
        return;
    }
    var checked;
    if (input.attr('name') === 'mode') {
        setMode(this.id.slice(0, -4)); // jshint ignore:line
    } else {
        if (input.attr('name') === 'deck') { // ToDo: Unify handling for decks and masts
            var deck = selector[0].id.slice(4);
            if (deck == 'All') {
                resetDecks();
            } else {
                $('#shadow' + deck).toggle(!input[0].checked); // ToDo: Optimize, do it once, store in selectors
                checked = $('#selectDecks :not(#deckAll) input:checked');
                switch (checked.length) {
                    case 1:
                        checked.prop('disabled', true);
                        break;
                    case 2:
                    case 3:
                        $('#selectDecks input').prop('disabled', false);
                        $('#deckAll input').prop('disabled', checked.length === 3).prop('checked', checked.length === 3);
                        break;
                    default:
                        assert(false, "Checkbox misconfiguration: " + checked.length);
                }
            }
        } else if (input.attr('name') === 'mast') {
            var mast = selector[0].id.slice(4);
            if (mast == 'All') {
                resetMasts();
            } else {
                checked = $('#selectMasts :not(#mastAll) input:checked');
                switch (checked.length) {
                    case 1:
                        checked.prop('disabled', true);
                        break;
                    case 2:
                    case 3:
                        $('#selectMasts input').prop('disabled', false);
                        $('#mastAll input').prop('disabled', checked.length === 3).prop('checked', checked.length === 3);
                        break;
                    default:
                        assert(false, "Checkbox misconfiguration: " + checked.length);
                }
            }
        }
    }
}

function Questionary() {
    // Static container
}

Questionary.ASKED = 'ASKED';
Questionary.ANSWERED = 'ANSWERED';

Questionary.mode = null;
Questionary.correctAnswer = null;
Questionary.status = null;
Questionary.statAll = 0;
Questionary.statCorrect = 0;

Questionary.askQuestion = function (mode) {
    if (mode) {
        Questionary.mode = mode;
        Questionary.reset();
    }
    var checkbox;
    switch(Questionary.mode) {
    case setMode.WHERE:
        var line;
        while (true) {
            line = Line.lines.random();
            checkbox = $('#selectMasts :contains("' + line.mast.name + '") input');
            if ((checkbox.length ? checkbox.prop('checked') : $('#mastAll input:checked').length) && line.name != Questionary.correctAnswer) {
                break;
            }
        }
        Questionary.correctAnswer = line.name;
        $('#question').text(Questionary.correctAnswer);
        $('#overlay').addClass('highlight pointer');
        $('#decks').addClass('highlight');
        $('.point, .pointNumber').removeClass('question rightAnswer wrongAnswer');
        $('#rightAnswer, #wrongAnswer, #nextQuestionNote').hide();
        Questionary.status = Questionary.ASKED;
        Point.tooltips(false);
        break;
    case setMode.WHICH:
        var point;
        while (true) {
            point = Point.points.random();
            checkbox = $('#selectDecks :contains("' + point.deck.name + '") input');
            if ((checkbox.length ? checkbox.prop('checked') : $('#deckAll input:checked').length) && point.description != Questionary.correctAnswer) {
                break;
            }
        }
        Questionary.correctAnswer = point.description;
        $('#question').text(Questionary.correctAnswer);
        $('#overlay').removeClass('highlight pointer');
        $('#lines').addClass('highlight');
        $('.point, .line').removeClass('question rightAnswer wrongAnswer');
        point.icon.addClass('question');
        $('#rightAnswer, #wrongAnswer, #nextQuestionNote').hide();
        Questionary.status = Questionary.ASKED;
        Point.tooltips(false);
        break;
    default:
        Questionary.status = null;
        Point.tooltips(true);
    }
};

Questionary.answerQuestion = function (event) {
    assert(this === event.target);
    if (Questionary.status !== Questionary.ASKED ||
        !event.data && Questionary.mode == setMode.WHERE ||
         event.data && Questionary.mode == setMode.WHICH) {
        return;
    }
    $('#overlay, #decks').removeClass('highlight');
    var element = $(this);
    var point = event.data;
    $.each(Point.points, function (_index, point) {
        if (point.line.name == Questionary.correctAnswer) {
            point.element.add(point.icon).addClass('rightAnswer');
        }
    });
    var isCorrect = point.line.name === Questionary.correctAnswer;
    if (isCorrect) {
        $('#rightAnswer').show();
        $('#wrongAnswer').hide();
    } else {
        point.element.add(point.icon).addClass('wrongAnswer').show();
        $('#rightAnswerText').text(point.line.name);
        $('#wrongAnswer').show();
        $('#rightAnswer').hide();
    }
    Questionary.updateStatistics(isCorrect);
    $('#nextQuestionNote').show();
    Questionary.status = Questionary.ANSWERED;
    Point.tooltips(true);
    event.stopPropagation(); // Avoid triggering nextQuestion()
};

Questionary.updateStatistics = function (isCorrect) {
    Questionary.statAll += 1;
    Questionary.statCorrect += isCorrect ? 1 : 0;
    $('#statCorrect').text(Questionary.statCorrect);
    $('#statAll').text(Questionary.statAll);
    $('#statPercent').text(Math.round(Questionary.statCorrect / Questionary.statAll * 100));
    $('#statistics').show();
};

Questionary.nextQuestion = function (event) {
    if (Questionary.status === Questionary.ANSWERED) {
        Questionary.askQuestion();
    } else if (Questionary.status === Questionary.ASKED && $(event.target).is('#nextQuestionButton')) {
        Questionary.updateStatistics();
        Questionary.askQuestion();
    }
};

Questionary.reset = function (event) {
    Questionary.statAll = Questionary.statCorrect = 0;
    $('#statistics').hide();
};

function main() {
    // Create data structures from constant data
    Deck.construct();
    Line.construct();
    // Create elements for data structures
    Deck.createElements();
    Mast.createElements();
    // Put generated elements to DOM
    Deck.placeElements('#decks');
    Mast.placeElements('#lines', '#fullLines');
    Point.placeElements('#overlay');
    // Setup scheme
    $('img.scheme').css({ width: SCHEME_WIDTH, height: SCHEME_HEIGHT });
    $('#overlay').css({ width: SCHEME_WIDTH, height: 2 * SCHEME_HEIGHT });
    onResize.scheme = $('#scheme');
    onResize.placeholder = $('#placeholder');
    var schemeBlock = $('#schemeBlock');
    // Setup menu
    setMode.modeDependent = $('.modeDependent');
    setMode.schemeBlock = schemeBlock;
    $('input[name=mode]').prop('checked', false);
    $('#toggleScheme').prop('checked', true).change(function (_event) { schemeBlock.toggle(); });
    $('#toggleMarks').prop('checked', true).change(function (_event) { $('#overlay, #decks').toggleClass('colored'); }).change();
    $('#toggleTooltips').prop('checked', false).change(function (_event) { Point.tooltips(this.checked); }).change();
    resetDecks();
    resetMasts();
    $('.selector').click(menuHandler);
    $('#resetButton').click(Questionary.reset);
    $('.selector, .point').mousedown(function (event) { event.preventDefault(); }); // Avoid selection by double-click
    // Finishing setup
    $('.line').click(Questionary.answerQuestion);
    $('body').click(Questionary.nextQuestion);
    setMode(window.location.hash.slice(1));
    onResize();
    $('#loading').hide();
    $('#main').show();
    $(window).resize(onResize);
}

$(document).ready(main);
