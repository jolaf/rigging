/* jshint strict: global */
/* globals $, document, location, window, CLEAT, SCHEME_WIDTH, SCHEME_HEIGHT, PIN, PORT, STARBOARD, CENTER, DECKS, LINES, DETAIL_LINE, LINE_DETAIL, SINGULAR, PLURAL, CLEWLINE, BUNTLINE, CLEWBUNTLINES, LEECHLINE, BOWLINE */
"use strict";

window.onerror = function (message, url, lineNo, columnNo, errorObject) {
    var prefix = 'Ошибка!\n\nПожалуйста, ';
    var suggestion = 'сделайте скриншот и отправьте картинку разработчику на почту vmzakhar@gmail.com с темой "Такелаж «Штандарта»".\n\nСпасибо!\n';
    if (message.toLowerCase().indexOf('script error') >= 0) {
        message = prefix + 'откройте консоль браузера (нажмите F12, выберите "Консоль"), после чего ' + suggestion;
    } else if (errorObject && errorObject.stack) {
        message = prefix + suggestion + '\n' + errorObject.stack + '\n';
    } else {
        message = prefix + suggestion + '\n' + message + '\n@ ' + url + ':' + lineNo + ':' + columnNo + '\n';
    }
    alert(message); // jshint ignore:line
};

function assert(condition, message) {
    if (!condition) {
        message = "Ошибка: " + (message || 'Assertion failed');
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

function Point(deck, rail, side, index, x, y, type, rotation) { // ToDo: Accept side
    assert(deck);
    this.deck = deck;
    assert(rail);
    this.rail = rail;
    this.side = side;
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

Point.prototype.createElement = function () { // ToDo: Add side to description using %s or to the end
    this.description = this.rail.description + (this.side === CENTER ? '' : ', по ' + (this.side === PORT ? 'левому' : 'правому') + ' борту');
    if (this.rail.direction) { // We can't do it in the constructor, as this.rail has not been constructed yet as in there
        var number;
        var direction;
        var center = (this.rail.points.length + 1) / 2;
        if (this.number <= center) {
            number = this.number;
            direction = number == center ? '' : ' ' + this.rail.direction;
        } else {
            number = this.rail.points.length + 1 - this.number;
            direction = ' ' + this.rail.reverseDirection;
        }
        this.description += ', ' + number  + '-' + (this.type === PIN ? 'й' : 'ая') + direction;
    }
    assert(this.line, "No line for point " + this.description);
    this.icon = $('<img class="point ' + this.type + '" ' + ' alt="" src="images/blank.gif">');
    this.icon.css({
        left: this.x,
        top: this.y, // Must be adjusted for height when visible (in placeElements), here it only works in Firefox
        transform: ((this.y <= -20) ? 'scaleY(-1) ' : '') + 'rotate(' + (this.rotation || 0.01) + 'deg)' // Rotation is needed for drop-shadow to work correctly on mirrored elements in Chrome
    });
    this.pointNumber = $('<a class="pointNumber">' + (this.rail.points.length == 1 ? 'I' : this.number) + '</a>');
    this.elements = this.icon.add(this.pointNumber);
    var name = this.line.name;
    this.elements.each(function (_index, element) {
        $(element).data('title', name);
    });
    this.elements.on('mouseenter mouseleave', this, function (event) {
        if (setMode.mode === setMode.WHICH && Questionary.status === Questionary.ASKED) {
            return;
        }
        if (setMode.mode === setMode.DEMO || Questionary.status === Questionary.ANSWERED) {
            if (setMode.mode === setMode.DEMO) {
                Questionary.lastEntered = event.type == 'mouseenter' ? event.data.icon : null;
                if (Questionary.status === Questionary.ANSWERED) {
                    return;
                }
            }
            event.data.line.mouseHandler(event.type == 'mouseenter');
        } else { // WHERE ASKED
            event.data.mouseHandler(event.type == 'mouseenter');
        }
    });
    this.elements.on('click', this, Questionary.answerQuestion);
    return this.pointNumber;
};

Point.prototype.mouseHandler = function (isEnter) {
    this.icon.toggleClass('on', isEnter);
    if (setMode.mode === setMode.WHERE) {
        this.pointNumber.toggleClass('on', isEnter);
    } else { // WHICH or DEMO
        $.each(this.line.sublines, function (_index, subline) {
            subline.element.toggleClass('on', isEnter); // ToDo: Replace with jQuery collection?
        });
    }
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

function Rail(deck, name, assym, x0, y0, stepX, stepY, nPoints, type, rotation, ignoreDeck) {
       // or (deck, name, assym, x0, x0, [[x, y, type = CLEAT, rotation = 0], ...], ignoreDeck)
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
        ignoreDeck = stepY;
    } else { // stepX, stepY, nPoints, type = PIN, rotation, ignoreDeck
        args = $.map(Array(nPoints || 1), function (_undefined, index) {
            return [[index, (x0 || 0) + (stepX || 0) * index, (y0 || 0) + (stepY || 0) * index, type || PIN, rotation || 0]]; // $.map flattens arrays
        });
    }
    this.description = ignoreDeck ? name.capitalize() : this.deck.title.capitalize() + ', ' + this.name;
    assert(args, "No points in rail: " + this.description);
    this.direction        = args.length < 2 ? null : args[1][1] - args[0][1] > args[1][2] - args[0][2] ? 'с кормы' : 'от центра';
    this.reverseDirection = args.length < 2 ? null : args[1][1] - args[0][1] > args[1][2] - args[0][2] ? 'с носа'  : 'с краю';
    var prefix = [deck, this, this.assym || STARBOARD];
    this.points = $.map(args, function (args, _index) {
        return applyNew(Point, prefix.concat(args));
    });
    if (!this.assym) {
        prefix[2] = PORT;
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
        number += this.points.length + 1;
    }
    assert (this.assym ? line.assym == this.assym : (!line.assym || line.assym == PORT || line.assym == STARBOARD), "Line assimmetry " + line.assym + " is not compatible with rail assimetry " + this.assym);
    var point;
    var ret = [];
    if (this.assym || line.assym != PORT) {
        point = this.points[number - 1];
        assert(point);
        point.attachLine(line); // ToDo: Pass side
        ret.push(point);
    }
    if (!this.assym && (!line.assym || line.assym == PORT)) {
        point = this.portPoints[number - 1];
        assert(point);
        point.attachLine(line); // ToDo: Pass side
        ret.push(point);
    }
    this.lines.push(line);
    line.number = number;
    return ret;
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

Line.prototype.mouseHandler = function (isEnter) {
    $.each(this.sublines.length == 1 ? this.sublines : this.points, function (_index, sublineOrPoint) { // ToDo: Cheat, won't work with multiple points
        sublineOrPoint.mouseHandler(isEnter); // ToDo: Replace with jQuery collection?
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

Line.getSublines = function () {
    $.each(Line.lines, function (_index, line) {
        line.sublines = Subline.getSublines(line);
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

function Subline(element, sublineType) {
    this.element = element;
    this.name = element.text();
    this.sublineType = sublineType;
    this.complimentaries = [];
    this.points = [];
    this.element.on('mouseenter mouseleave', this, function (event) {
        if (setMode.mode === setMode.DEMO) {
            Questionary.lastEntered = event.type == 'mouseenter' ? event.data.element : null;
            if (Questionary.status === Questionary.ANSWERED) {
                return;
            }
        }
        event.data.mouseHandler(event.type == 'mouseenter');
    });
    this.element.on('click', this, Questionary.answerQuestion);
}

Subline.SAIL = 'SAIL';
Subline.SAILLINE = 'SAILLINE';
Subline.NONSAILLINE = 'NONSAILLINE';

Subline.prototype.addLine = function (line) {
    var points = this.points;
    $.each(line.points, function (_index, point) {
        if (points.indexOf(point) < 0) {
            points.push(point);
        }
    });
    return this;
};

Subline.prototype.mouseHandler = function (isEnter) {
    if (setMode.mode === setMode.WHICH && Questionary.status === Questionary.ASKED) {
        this.element.toggleClass('on', isEnter);
    } else {
        $.each(this.points, function (_index, point) {
            point.mouseHandler(isEnter); // ToDo: Replace with jQuery collection?
        });
    }
};

Subline.construct = function () {
    var uniqueNames = [];
    Subline.sublines = [];
    $('#sublines').children().each(function (_index, group) {
        group = $(group);
        var sublineType;
        if (group.is('.sails')) {
            sublineType = Subline.SAIL;
        } else if (group.is('.sailLines')) {
            sublineType = Subline.SAILLINE;
        } else if (group.is('.nonSailLines')) {
            sublineType = Subline.NONSAILLINE;
        } else {
            assert(false, "Wrong subline type: " + sublineType);
        }
        $(group).find('.subline').each(function (_index, element) {
            var subline = applyNew(Subline, [$(element), sublineType]);
            assert($.inArray(uniqueNames, subline.name) < 0, "Duplicate subline name: " + subline.name);
            uniqueNames.push(subline.name);
            Subline.sublines.push(subline);
        });
    });
};

Subline.getSublines = function (line) {
    var ret = [];
    var sublines;
    if (line.sail.name) {
        sublines = Subline.sublines.filter(function (subline) {
            return subline.sublineType == Subline.SAIL && subline.name == (line.detail && line.name.indexOf(line.lineName) === 0 ? line.detail : line.sail.name);
        });
        assert(sublines.length, "Unknown subline sail: " + line.sail.name);
        assert(sublines.length == 1, "Duplicate subline sail: " + line.sail.name);
        var sailSubline = sublines[0];
        ret.push(sailSubline.addLine(line));
        sublines = Subline.sublines.filter(function (subline) {
            return subline.sublineType === Subline.SAILLINE && (subline.name == (line.detail || line.lineName) || line.name.indexOf(subline.name + ' ') === 0);
        });
        assert(sublines.length, "Unknown sail subline: " + line.lineName);
        assert(sublines.length == 1, "Duplicate sail subline: " + line.lineName);
        var sailLineSubline = sublines[0];
        ret.push(sailLineSubline.addLine(line));
        sailSubline.complimentaries.push(sailLineSubline);
        sailLineSubline.complimentaries.push(sailSubline);
    } else {
        var lineName = line.name.toLowerCase();
        sublines = Subline.sublines.filter(function (subline) {
            return subline.sublineType === Subline.NONSAILLINE && lineName.indexOf(subline.name.toLowerCase()) >= 0;
        });
        assert(sublines.length, "Unknown non-sail subline: " + lineName);
        assert(sublines.length == 1, "Duplicate non-sail subline: " + lineName);
        ret.push(sublines[0].addLine(line));
    }
    return ret;
};

function onResize() {
    onResize.scheme.hide();
    var scale = $(document).width() / SCHEME_WIDTH;
    onResize.placeholder.css({ height: Math.floor(2 * SCHEME_HEIGHT * scale) });
    onResize.scheme.css({ transform: 'scale(' + scale + ')'}).show();
}

function setMode(mode) {
    mode = mode.trim().toLowerCase() || 'info';
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
        case setMode.INFO:
            setMode.schemeBlock.hide();
            break;
        case setMode.DEMO:
            Questionary.lastEntered = null;
            setMode.schemeBlock.show();
            break;
        case setMode.WHERE:
            $('#toggleScheme input').change();
            $('.mask').hide();
            break;
        case setMode.WHICH:
            $('#toggleScheme input').change();
            $('#selectDecks .selector').each(function (_index, selector) { // ToDo: Unify with menuHandler()
                $('#shadow' + selector.id.slice(4)).toggle(!$(selector).find('input')[0].checked);
            });
            break;
        default:
            setMode(setMode.INFO);
            return;
    }
    Questionary.reset();
    Questionary.askQuestion();
}

setMode.INFO = 'info';
setMode.DEMO = 'demo';
setMode.WHERE = 'where';
setMode.WHICH = 'which';

setMode.mode = null;

function resetDecks() {
    $('.mask').hide();
    $('#selectDecks .selector').attr('disabled', false);
    $('#selectDecks input').prop('checked', true).prop('disabled', false);
    $('#selectDecks .selector:first-child').attr('disabled', true);
    $('#selectDecks :first-child input').prop('disabled', true);
}

function resetMasts() {
    $('#selectMasts .selector').attr('disabled', false);
    $('#selectMasts input').prop('checked', true).prop('disabled', false);
    $('#selectMasts .selector:first-child').attr('disabled', true);
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
        if (input[0].checked) {
            Questionary.reset();
        }
        if (input.attr('name') === 'deck') { // ToDo: Unify handling for decks and masts
            var deck = selector[0].id.slice(4);
            if (deck == 'All') {
                resetDecks();
            } else {
                $('#shadow' + deck).toggle(!input[0].checked); // ToDo: Optimize, do it once, store in selectors
                checked = $('#selectDecks :not(#deckAll) input:checked'); // ToDo: Create special class for not-all decks
                switch (checked.length) {
                    case 1:
                        checked.parent().attr('disabled', true);
                        checked.prop('disabled', true);
                        break;
                    case 2:
                    case 3:
                        $('#selectDecks .selector').attr('disabled', false);
                        $('#selectDecks input').prop('disabled', false);
                        $('#deckAll').attr('disabled', checked.length === 3);
                        $('#deckAll input').prop('disabled', checked.length === 3).prop('checked', checked.length === 3);
                        break;
                    default:
                        assert(false, "Checkbox misconfiguration: " + checked.length);
                }
                if (Questionary.status === Questionary.ASKED && !$('#selectDecks :contains("' + Questionary.correctAnswer.deck.name + '") input')[0].checked) {
                    Questionary.askQuestion();
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
                        checked.parent().attr('disabled', true);
                        checked.prop('disabled', true);
                        break;
                    case 2:
                    case 3:
                        $('#selectMasts .selector').attr('disabled', false);
                        $('#selectMasts input').prop('disabled', false);
                        $('#mastAll').attr('disabled', checked.length === 3);
                        $('#mastAll input').prop('disabled', checked.length === 3).prop('checked', checked.length === 3);
                        break;
                    default:
                        assert(false, "Checkbox misconfiguration: " + checked.length);
                }
                if (Questionary.status === Questionary.ASKED && Questionary.correctAnswer.mast.name) {
                    input = $('#selectMasts :contains("' + Questionary.correctAnswer.mast.name + '") input');
                    if (input.length && !input[0].checked) {
                        Questionary.askQuestion();
                    }
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

Questionary.correctAnswer = null;
Questionary.preAnswer = null;
Questionary.status = null;
Questionary.statAll = 0;
Questionary.statCorrect = 0;

Questionary.lastEntered = null;

Questionary.askQuestion = function () {
    var checkbox;
    switch(setMode.mode) {
        case setMode.INFO:
            Questionary.status = null;
            break;
        case setMode.DEMO:
            $('#overlay, #sublines').addClass('highlight');
            $('.point, .subline').removeClass('on question rightAnswer wrongAnswer');
            Questionary.status = Questionary.ASKED;
            Point.tooltips(true);
            if (Questionary.lastEntered) {
                Questionary.lastEntered.mouseenter();
                Questionary.lastEntered = null;
            }
            break;
        case setMode.WHERE:
            var line;
            while (true) {
                line = Line.lines.random();
                checkbox = $('#selectMasts :contains("' + line.mast.name + '") input');
                if ((checkbox.length ? checkbox.prop('checked') : $('#mastAll input:checked').length) && (!Questionary.correctAnswer || line.name != Questionary.correctAnswer.name)) {
                    break;
                }
            }
            Questionary.correctAnswer = line;
            $('#question').text(Questionary.correctAnswer.name);
            $('#overlay, #pointNumbers').addClass('highlight');
            $('.point, .pointNumber').removeClass('on question rightAnswer wrongAnswer');
            $('#rightAnswer, #wrongAnswer, #nextQuestionNote').hide();
            $('#tooltipNote').show();
            Questionary.status = Questionary.ASKED;
            Point.tooltips(false);
            break;
        case setMode.WHICH:
            var point;
            while (true) {
                point = Point.points.random();
                checkbox = $('#selectDecks :contains("' + point.deck.name + '") input');
                if ((checkbox.length ? checkbox.prop('checked') : $('#deckAll input:checked').length) && (!Questionary.correctAnswer || point.description != Questionary.correctAnswer.description)) {
                    break;
                }
            }
            Questionary.correctAnswer = point;
            $('#question').text(Questionary.correctAnswer.description);
            $('#overlay').removeClass('highlight pointer');
            $('#sublines').addClass('highlight');
            $('.point, .subline').removeClass('on question rightAnswer wrongAnswer');
            $('.preAnswer').removeClass('preAnswer');
            point.icon.addClass('question');
            $('#rightAnswer, #wrongAnswer, #nextQuestionNote').hide();
            $('#tooltipNote').show();
            Questionary.status = Questionary.ASKED;
            Questionary.preAnswer = null;
            Point.tooltips(false);
            break;
        default:
            assert(false);
    }
};

Questionary.answerQuestion = function (event) {
    assert(this === event.target);
    assert(event.data);
    if (Questionary.status !== Questionary.ASKED) {
        return;
    }
    event.stopPropagation(); // Avoid triggering nextQuestion()
    var element = $(this);
    var isCorrect;
    switch(setMode.mode) {
        case setMode.DEMO:
            Questionary.status = Questionary.ANSWERED;
            return;
        case setMode.WHERE:
            var point = event.data;
            point.elements.removeClass('on');
            $.each(Point.points, function (_index, point) {
                if (point.line.name == Questionary.correctAnswer.name) {
                    point.elements.addClass('rightAnswer');
                }
            });
            isCorrect = point.line.name === Questionary.correctAnswer.name;
            if (!isCorrect) {
                point.elements.addClass('wrongAnswer');
                $('#rightAnswerText').text(point.line.name);
            }
            break;
        case setMode.WHICH:
            var subline = event.data;
            if (!(subline instanceof Subline)) {
                return;
            }
            var points;
            if (Questionary.preAnswer) {
                Questionary.preAnswer.element.removeClass('preAnswer');
            }
            if (subline.sublineType === Subline.NONSAILLINE) {
                Questionary.preAnswer = null;
                points = subline.points;
            } else {
                if (!Questionary.preAnswer && subline.complimentaries.length === 1) {
                    Questionary.preAnswer = subline.complimentaries[0];
                }
                if (!Questionary.preAnswer || subline.sublineType === Questionary.preAnswer.sublineType) {
                    Questionary.preAnswer = subline;
                    subline.element.addClass('preAnswer');
                    return;
                }
                points = subline.points.filter(function (value) {
                    return Questionary.preAnswer.points.indexOf(value) >= 0;
                });
            }
            isCorrect = points.indexOf(Questionary.correctAnswer) >= 0;
            subline.element.mouseout();
            $('#overlay').addClass('highlight');
            Questionary.correctAnswer.icon.addClass('rightAnswer');
            $.each(Questionary.correctAnswer.line.sublines, function (_index, subline) {
                subline.element.addClass('rightAnswer');
            });
            if (!isCorrect) {
                $.each(points, function (_index, point) {
                    point.icon.addClass('wrongAnswer');
                });
                subline.element.addClass('wrongAnswer');
                if (Questionary.preAnswer) {
                    Questionary.preAnswer.element.addClass('wrongAnswer');
                }
                $('#rightAnswerText').text(Questionary.correctAnswer.line.name);
            }
            Questionary.status = Questionary.ANSWERED;
            break;
        default:
            assert(false);
    }
    Questionary.status = Questionary.ANSWERED;
    if (isCorrect) {
        $('#rightAnswer').show();
        $('#wrongAnswer').hide();
    } else {
        $('#wrongAnswer').show();
        $('#rightAnswer').hide();
    }
    Questionary.updateStatistics(isCorrect);
    $('#tooltipNote').hide();
    $('#nextQuestionNote').show();
    Point.tooltips(true);
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
    Subline.construct();
    // Create elements for data structures
    Deck.createElements();
    Line.getSublines();
    // Put generated elements to DOM
    Deck.placeElements('#pointNumbers');
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
    $('#toggleScheme input').prop('checked', true).change(function (_event) {
        schemeBlock.toggle(this.checked);
        if (this.checked) {
            Questionary.reset();
        }
        if (setMode.mode === setMode.WHICH) {
            $('#toggleMarks').toggle(this.checked);
        }
    });
    $('#toggleMarks input').prop('checked', true).change(function (_event) {
        $('#overlay, #pointNumbers').toggleClass('colored', this.checked);
        if (this.checked) {
            Questionary.reset();
        }
    }).change();
    resetDecks();
    resetMasts();
    $('.selector').click(menuHandler);
    $('#resetButton').click(Questionary.reset);
    $('.selector, .point, .pointNumber, .subline').mousedown(function (_event) { return false; }); // Avoid selection by double-click
    // Finishing setup
    $('body').click(Questionary.nextQuestion);
    $('button.info').on('hover mousedown keydown', function (_event) { return false; });
    setMode(window.location.hash.slice(1));
    onResize();
    $('#loading').hide();
    $('#main').show();
    $(window).resize(onResize);
}

$(document).ready(main);
