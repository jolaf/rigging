/* jshint strict: global */
/* globals $, document, location, window, CLEAT, SCHEME_WIDTH, SCHEME_HEIGHT, PIN, PORT, STARBOARD, CENTER, DECKS, LINES, DETAIL_LINE, LINE_DETAIL, SINGULAR, PLURAL, CLEWLINE, BUNTLINE, LEECHLINE, BOWLINE */
"use strict";

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
    return this.slice(0, (cut === 0) ? 0 : -(cut || suffix.length)) + suffix;
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

function Point(deck, rail, side, index, x, y, type, rotation) {
    assert(deck, "No deck for a Point");
    this.deck = deck;
    assert(rail, "No rail for a Point");
    this.rail = rail;
    this.side = side;
    this.number = index + 1;
    this.x = x;
    this.y = y;
    this.type = type || CLEAT;
    this.rotation = rotation;
    this.lines = [];
    Point.points.push(this);
}

Point.points = [];

Point.marks = {};
Point.marks[ CLEWLINE] = 'clewline';
Point.marks[ BUNTLINE] = 'buntline';
Point.marks[LEECHLINE] = 'leechline';
Point.marks[  BOWLINE] = 'bowline';

Point.locationObject = null;

Point.prototype.createObject = function () {
    // Setting location, we can't do it in the constructor, as this.rail has not been constructed yet as in there
    this.location = this.rail.location + ((this.side === CENTER) ? '' : (', по ' + (this.side === PORT ? 'левому' : 'правому') + ' борту'));
    if (this.rail.direction) {
        var number;
        var direction;
        var center = (this.rail.points.length + 1) / 2;
        if (this.number <= center) {
            number = this.number;
            direction = (number === center) ? '' : (' ' + this.rail.direction);
        } else {
            number = this.rail.points.length + 1 - this.number;
            direction = ' ' + this.rail.reverseDirection;
        }
        this.location += ', ' + number  + '-' + ((this.type === PIN) ? 'й' : 'ая') + direction;
    }
    // Constructing point name from names of connected lines
    assert(this.lines, "No lines for Point " + this.location);
    if (this.lines.length === 1) {
        this.name = this.lines[0].name;
    } else {
        var lineNames = this.lines.map(function (line) { return line.name; });
        var subNames = [];
        var theLastWord;
        for (var i = 0, lineName; lineName = lineNames[i++];) { // jshint ignore:line
            var words = lineName.split(' ');
            var lastWord = words[words.length - 1];
            if (theLastWord) {
                if (lastWord != theLastWord) {
                    this.name = lineNames.join(' / ');
                    break; // This is why we use for(), not $.each() above
                }
            } else {
                theLastWord = lastWord;
            }
            subNames.push(words.slice(0, -1).join(' '));
        }
        if (!this.name) {
            this.name = subNames.join(' / ') + ' ' + theLastWord;
        }
    }
    // Connecting similarly named lines
    var thisLines = this.lines;
    $.each(Line.lines, function (_index, line) {
        if (thisLines.indexOf(line) < 0) {
            $.each(thisLines, function (_index, thisLine) {
                if (line.name === thisLine.name) {
                    thisLines.push(line);
                }
            });
        }
    });
    // Creating HTML objects
    this.iconObject = $('<img class="point ' + this.type + '" ' + ' alt="" src="images/blank.gif">');
    this.iconObject.css({
        left: this.x,
        top: this.y, // Must be adjusted for height when visible (in placeObjects), here it only works in Firefox
        transform: ((this.y <= -20) ? 'scaleY(-1) ' : '') + 'rotate(' + (this.rotation || 0.01) + 'deg)' // Rotation is needed for drop-shadow to work correctly on mirrored elements in Chrome
    });
    this.numberObject = $('<a class="pointNumber">' + ((this.rail.points.length === 1) ? 'I' : this.number) + '</a>');
    // Preparing jQuery collections
    this.objects = this.iconObject.add(this.numberObject);
    var thisName = this.name;
    this.objects.each(function (_index, element) {
        $(element).data('title', thisName);
    });
    // Setting event handlers
    this.objects.on('click', this, Questionary.answerQuestion);
    this.objects.on('mouseenter mouseleave', this, this.mouseHandler);
    return this.numberObject;
};

Point.prototype.attachLine = function (line) {
    this.lines.push(line);
};

Point.placeObjects = function () {
    Point.locationObject = $('#overlay');
    $.each(Point.points, function (_index, point) {
        var iconObject = point.iconObject;
        Point.locationObject.append(iconObject);
        iconObject.css({ // Could be done in createObject(), but it only works in Firefox
            top: '+=' + (SCHEME_HEIGHT - ((parseInt(iconObject.css('top')) > -20) ? 0 : parseInt(iconObject.css('height')))),
        });
        point.objects.addClass(this.lines.map(function (line) { return Point.marks[line.lineName]; }).join(' '));
    });
};

Point.toggleTooltips = function (enable) {
    $.each(Point.points, function (_index, point) {
        point.objects.each(function (_index, pointObject) {
            pointObject = $(pointObject);
            if (enable) {
                pointObject.attr('title', pointObject.data('title'));
            } else {
                pointObject.removeAttr('title');
            }
        });
    });
};

Point.prototype.mouseHandler = function (event) {
    assert(this === event.target, "Event delegation error, expected " + event.target + " but got " + this);
    assert(event.data, "Event data is not specified");
    if (setMode.mode === setMode.WHICH && Questionary.status === Questionary.ASKED) {
        return;
    }
    var isEnter = (event.type === 'mouseenter');
    if (setMode.mode === setMode.DEMO) {
        Questionary.lastEntered = isEnter ? event.data.iconObject : null;
        if (Questionary.status === Questionary.ANSWERED) {
            return;
        }
    }
    (setMode.mode === setMode.WHERE ?
        (Questionary.status === Questionary.ASKED ? event.data.objects
                                                  : event.data.whereObjects)
                                                  : event.data.demoObjects).toggleClass('on', isEnter);
};

function Rail(deck, name, assym, x0, y0, stepX, stepY, nPoints, type, rotation, ignoreDeck) {
       // or (deck, name, assym, x0, x0, [[x, y, type = CLEAT, rotation = 0], ...], ignoreDeck)
    assert(name, "No name for a Rail");
    this.name = name;
    assert(deck, "No deck for Rail " + name);
    this.deck = deck;
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
    this.location = ignoreDeck ? name.capitalize() : (this.deck.title.capitalize() + ', ' + this.name);
    assert(args, "No points in Rail " + this.name);
    if (args.length < 2) {
        this.direction = this.reverseDirection = null;
    } else {
        var isFirstHalf = (args[1][1] - args[0][1] > args[1][2] - args[0][2]);
        this.direction =  isFirstHalf ? 'с кормы' : 'от центра';
        this.reverseDirection = isFirstHalf ? 'с носа'  : 'с краю';
    }
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
}

Rail.prototype.attachLine = function (number, line) {
    if (!number) {
        number = 1;
    } else if (number < 0) {
        number += this.points.length + 1;
    }
    assert(this.assym ? line.assym === this.assym
                      : !line.assym || line.assym === PORT || line.assym === STARBOARD,
        "Line assimmetry " + line.assym + " is not compatible with rail assimetry " + this.assym);
    var point;
    var ret = [];
    if (this.assym || line.assym != PORT) {
        point = this.points[number - 1];
        assert(point, "Bad point number: " + number);
        point.attachLine(line);
        ret.push(point);
    }
    if (!this.assym && (!line.assym || line.assym === PORT)) {
        point = this.portPoints[number - 1];
        assert(point, "Bad point number: " + number);
        point.attachLine(line);
        ret.push(point);
    }
    line.number = number;
    return ret;
};

Rail.prototype.createObject = function () {
    var object = $('<li class="rail"><span class="rail">' + this.name + '</span>: <span class="points"></span></li>');
    var points = $('span.points', object);
    $.each(this.portPoints.reverse(), function (_index, point) {
        points.append(point.createObject()).append(' ');
    });
    if (this.portPoints.length) {
        points.append('&nbsp;');
    }
    $.each(this.points, function (_index, point) {
        points.append(' ').append(point.createObject());
    });
    this.object = object;
    return this.object;
};

function Deck(name, id, title, rails) {
    assert(name, "No name for a Deck");
    this.name = name;
    assert(id, "No ID for Deck " + name);
    this.id = id;
    assert(title, "No title for Deck " + name);
    this.title = title;
    var uniqueRails = [];
    var thisDeck = this;
    this.rails = $.map(rails, function (railArgs, _index) {
        var rail = applyNew(Rail, [thisDeck,].concat(railArgs));
        assert($.inArray(uniqueRails, rail.name) < 0, "Duplicate Rail name: " + thisDeck.name + '/' + rail.name);
        uniqueRails.push(rail.name);
        return rail;
    });
}

Deck.construct = function () {
    var uniqueNames = [];
    Deck.decks = $.map(DECKS, function (deckArgs, _index) {
        var deck = applyNew(Deck, deckArgs);
        assert($.inArray(uniqueNames, deck.name) < 0, "Duplicate deck name: " + deck.name);
        uniqueNames.push(deck.name);
        return deck;
    });
};

Deck.prototype.attachLine = function (railName, number, line) {
    assert(line, "No line to attach to a Deck");
    var rails = this.rails.filter(function (rail) { return railName === rail.name; });
    assert(rails.length === 1, "Unknown rail to attach in a Deck: " + railName);
    return rails[0].attachLine(number, line);
};

Deck.prototype.createObject = function () {
    var object =  $('<td class="deck"><h2>' + this.title.capitalize() + '</h2><ul></ul></td>');
    var ul = $('ul', object);
    $.each(this.rails, function (_index, rail) {
        ul.append(rail.createObject());
    });
    this.object = object;
    return this.object;
};

Deck.createObjects = function () {
    $.each(Deck.decks, function (_index, deck) {
        deck.createObject();
    });
};

Deck.prototype.placeObject = function () {
    Deck.locationObject.prepend(this.object);
    this.checkbox = $('#' + this.id + 'DeckSwitch input');
    assert(this.checkbox.length === 1, "Deck checkbox not found: " + this.name + " / " + this.id);
};

Deck.placeObjects = function () {
    Deck.locationObject = $('#pointNumbers');
    $.each(Deck.decks, function (_index, deck) {
        deck.placeObject();
    });
    Deck.allSwitch = $('#allDeckSwitch');
    Deck.allCheckbox = $('input', Deck.allSwitch);
    assert(Deck.allCheckbox.length === 1, "All decks checkbox not found");
};

Deck.getDeck = function (deckName) {
    assert(deckName, "No deck name specified");
    var decks = Deck.decks.filter(function (deck) { return deckName === deck.name; });
    assert(decks.length === 1, "Unknown Deck: " + deckName);
    return decks[0];
};

function Line(mastName, mastID, sailName, deckName, railName, number, lineName, detail, assym, fullName, pluralName) {
    this.assym = assym || false;
    this.points = Deck.getDeck(deckName).attachLine(railName, number, this); // Also sets this.number
    this.mast = Mast.getMast(mastName, mastID);
    this.sail = this.mast.getSail(sailName);
    assert(lineName, "No name for a Line");
    this.lineName = lineName;
    this.detail = detail || '';
    fullName = fullName || '';
    var fullNameWords;
    var pluralWords;
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
            fullNameWords = (this.detail ? [this.detail,] : []).concat([this.lineName,]).concat((this.sail.name || this.mast.name) ? [this.sail.name || this.mast.name,] : []);
            fullNameWords = fullNameWords.slice(0, 1).concat($.map(fullNameWords.slice(1), russianGenetive));
            pluralWords = $.map(fullNameWords.slice(0, -1), russianPlural).concat(fullNameWords.slice(-1));
            pluralWords = pluralWords.slice(0, 1).concat($.map(pluralWords.slice(1, -1), russianGenetive)).concat(pluralWords.slice(-1));
            break;
        default:
            pluralWords = fullNameWords = fullName.split(' ');
    }
    assert(fullNameWords, "Empty fullNameWords for a Line");
    pluralName = pluralName || '';
    switch (pluralName) {
        case SINGULAR:
        case PLURAL:
        case '': // GRAMMAR
            break; // We'll process it later
        default:
            pluralWords = pluralName.split(' ');
    }
    assert(pluralWords, "Empty pluralWords for a Line");
    this.name = fullNameWords.join(' ').capitalize();
    this.pluralName = (pluralName === SINGULAR) ? this.name : pluralWords.join(' ').capitalize();
    this.name = (pluralName === PLURAL) ? this.pluralName : this.name;
    if (this.assym) {
        this.pluralName = null;
    }
}

Line.construct = function () {
    Line.lines = [];
    $.each(LINES, function (_index, args) {
        var prefix = [args[0], args[1], ''];
        $.each(args[2], function (_index, args) {
            prefix[2] = args[0];
            $.each(args[1], function (_index, args) {
                Line.lines.push(applyNew(Line, prefix.concat(args)));
            });
        });
    });
};

Line.linkLines = function () {
    $.each(Line.lines, function (_index, line) {
        var demoElements = [];
        var whereElements = [];
        line.sublines = Subline.getSublines(line);
        $.each(line.sublines, function (_index, subline) {
            demoElements.push(subline.object[0]);
        });
        $.each(line.points, function (_index, point) {
            demoElements.push(point.iconObject[0]);
            whereElements.push(point.iconObject[0]);
            whereElements.push(point.numberObject[0]);
        });
        line.demoObjects = $(demoElements);
        line.whereObjects = $(whereElements);
    });
    $.each(Point.points.concat(Subline.sublines), function (_index, target) {
        var demoElements = [];
        var whereElements = [];
        $.each(target.lines, function (_index, line) {
            Array.prototype.push.apply(demoElements, line.demoObjects.toArray());
            if (target instanceof Point) {
                Array.prototype.push.apply(whereElements, line.whereObjects.toArray());
            }
        });
        target.demoObjects = $(demoElements);
        if (target instanceof Point) {
            target.whereObjects = $(whereElements);
        }
    });
};

function Sail(name, mast) {
    assert(mast, "No mast for a Sail");
    this.name = name;
}

function Mast(name, id) {
    this.name = name;
    this.id = id;
    this.sails = [];
}

Mast.masts = [];

Mast.getMast = function (mastName, mastID) {
    mastName = mastName || '';
    var masts = Mast.masts.filter(function (mast) { return mast.name === mastName; });
    var mast;
    if (masts.length) { // === 1
        mast = masts[0];
    } else {
        mast = new Mast(mastName, mastID);
        Mast.masts.push(mast);
    }
    return mast;
};

Mast.prototype.getSail = function (sailName) {
    sailName = sailName || '';
    var sails = this.sails.filter(function (sail) { return sail.name === sailName; });
    var sail;
    if (sails.length) { // === 1
        sail = sails[0];
    } else {
        sail = new Sail(sailName, this);
        this.sails.push(sail);
    }
    return sail;
};

Mast.prototype.placeObject = function () {
    this.checkbox = $('#' + this.id + 'MastSwitch input');
    if (!this.checkbox.length) {
        this.checkbox = null;
    }
};

Mast.placeObjects = function () {
    $.each(Mast.masts, function (_index, mast) {
        mast.placeObject();
    });
    Mast.allSwitch = $('#allMastSwitch');
    Mast.allCheckbox = $('input', Mast.allSwitch);
    assert(Mast.allCheckbox.length === 1, "All masts checkbox not found");
};

function Subline(object, sublineType) {
    this.object = object;
    this.name = object.text();
    this.sublineType = sublineType;
    this.sublines = [];
    this.points = [];
    this.lines = [];
    this.object.on('click', this, Questionary.answerQuestion);
    this.object.on('mouseenter mouseleave', this, this.mouseHandler);
}

Subline.SAIL = 'SAIL';
Subline.SAILLINE = 'SAILLINE';
Subline.NONSAILLINE = 'NONSAILLINE';

Subline.prototype.addLine = function (line) {
    this.lines.push(line);
    var thisPoints = this.points;
    $.each(line.points, function (_index, point) {
        if (thisPoints.indexOf(point) < 0) {
            thisPoints.push(point);
        }
    });
    return this;
};

Subline.prototype.mouseHandler = function (event) {
    assert(this === event.target, "Event delegation error, expected " + event.target + " but got " + this);
    assert(event.data, "Event data is not specified");
    var isEnter = (event.type === 'mouseenter');
    if (setMode.mode === setMode.DEMO) {
        Questionary.lastEntered = isEnter ? event.data.object : null;
        if (Questionary.status === Questionary.ANSWERED) {
            return;
        }
    }
    (setMode.mode === setMode.WHICH &&
     Questionary.status === Questionary.ASKED ?
        event.data.object
      : event.data.demoObjects).toggleClass('on', isEnter);
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
        $('.subline', group).each(function (_index, element) {
            var object = $(element);
            var subline = applyNew(Subline, [object, sublineType]);
            assert($.inArray(uniqueNames, subline.name) < 0, "Duplicate subline name: " + subline.name);
            uniqueNames.push(subline.name);
            Subline.sublines.push(subline);
            if (sublineType === Subline.SAIL) {
                object.text(russianGenetive(subline.name));
            }
        });
    });
};

Subline.getSublines = function (line) {
    var ret = [];
    var sublines;
    if (line.sail.name) {
        sublines = Subline.sublines.filter(function (subline) {
            return subline.sublineType === Subline.SAIL && subline.name === ((line.detail && line.name.indexOf(line.lineName) === 0) ? line.detail : line.sail.name);
        });
        assert(sublines.length, "Unknown subline sail: " + line.sail.name);
        assert(sublines.length === 1, "Duplicate subline sail: " + line.sail.name);
        var sailSubline = sublines[0];
        ret.push(sailSubline.addLine(line));
        sublines = Subline.sublines.filter(function (subline) {
            return subline.sublineType === Subline.SAILLINE && (subline.name === (line.detail || line.lineName) || line.name.startsWith(subline.name + ' '));
        });
        assert(sublines.length, "Unknown sail subline: " + line.lineName);
        assert(sublines.length === 1, "Duplicate sail subline: " + line.lineName);
        var sailLineSubline = sublines[0];
        ret.push(sailLineSubline.addLine(line));
        sailSubline.sublines.push(sailLineSubline);
        sailLineSubline.sublines.push(sailSubline);
    } else {
        var lineName = line.name.toLowerCase();
        sublines = Subline.sublines.filter(function (subline) {
            return subline.sublineType === Subline.NONSAILLINE && lineName.indexOf(subline.name.toLowerCase()) >= 0;
        });
        assert(sublines.length, "Unknown non-sail subline: " + lineName);
        assert(sublines.length === 1, "Duplicate non-sail subline: " + lineName);
        $.each(sublines, function (_index, subline) {
            ret.push(subline.addLine(line));
        });
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
    mode = mode.trim();
    mode = mode.startsWith('#') ? mode.slice(1) : mode.endsWith('ModeSwitch') ? mode.slice(0, -10) : mode;
    mode = mode.trim().toLowerCase();
    if (mode === setMode.mode) {
        return;
    }
    var modeCheckbox = setMode.checkboxes[mode];
    if (!modeCheckbox) {
        mode = setMode.INFO;
        modeCheckbox = setMode.checkboxes[mode];
    }
    setMode.mode = mode;
    location.href = '#' + mode;
    modeCheckbox.prop('checked', true);
    setMode.allDependents.hide();
    setMode.dependents[mode].show(); // ToDo: Refactor to use a single cycle using hasClass
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
        case setMode.WHICH:
            setMode.schemeCheckbox.change();
            break;
        default:
            assert(false, "Unknown mode: " + mode);
    }
    Questionary.reset();
    Questionary.askQuestion();
}

setMode.INFO = 'info';
setMode.DEMO = 'demo';
setMode.WHERE = 'where';
setMode.WHICH = 'which';

setMode.checkboxes = {};
setMode.dependents = {};
setMode.deckMasks = null;
setMode.mastMasks = null;
setMode.schemeSelector = null;
setMode.schemeCheckbox = null;

setMode.mode = null;

function menuHandler(event) {
    var selector = $(this); // jshint ignore:line
    var input = $('input', selector);
    if (this === event.target) { // jshint ignore:line
        input.click();
        return;
    }
    if (input.attr('name') === 'mode') {
        setMode(this.id); // jshint ignore:line
        return;
    }
    if (input.prop('checked')) {
        Questionary.reset();
    }
    var checked;
    if (input.attr('name') === 'deck') { // ToDo: Unify handling for decks and masts
        var deck = selector[0].id.slice(0, -10); // ToDo: Store as data in input or selector
        if (deck === 'all') {
            $('.deckMask').hide(); // ToDo: Optimize, do it once, store in selectors
            $('#selectDecks input').prop('checked', true); // ToDo: Optimize, do it once, store in selectors
        } else {
            $('#' + deck + 'DeckMask').toggle(!input.prop('checked')); // ToDo: Optimize, do it once, store in selectors
        }
        checked = $('#selectDecks :not(#allDeckSwitch) input:checked'); // ToDo: Create special class for not-all decks
        switch (checked.length) {
            case 1:
                checked.parent().attr('disabled', true);
                checked.prop('disabled', true);
                break;
            case 2:
            case 3:
                $('#selectDecks .selector').attr('disabled', false);
                $('#selectDecks input').prop('disabled', false);
                $('#allDeckSwitch').attr('disabled', checked.length === 3);
                $('#allDeckSwitch input').prop('disabled', checked.length === 3).prop('checked', checked.length === 3);
                break;
            default:
                assert(false, "Checkbox misconfiguration: " + checked.length);
        }
        if (Questionary.status === Questionary.ASKED && !$('#selectDecks :contains("' + Questionary.correctAnswer.deck.name + '") input').prop('checked')) {
            Questionary.askQuestion();
        }
    } else if (input.attr('name') === 'mast') {
        var mast = selector[0].id.slice(0, -10);
        if (mast === 'all') {
            $('.mastMask').hide(); // ToDo: Optimize, do it once, store in selectors
            $('#selectMasts input').prop('checked', true); // ToDo: Optimize, do it once, store in selectors
        } else {
            $('#' + mast + 'MastMask').toggle(!input.prop('checked')); // ToDo: Optimize, do it once, store in selectors
        }
        checked = $('#selectMasts :not(#allMastSwitch) input:checked');
        switch (checked.length) {
            case 1:
                checked.parent().attr('disabled', true);
                checked.prop('disabled', true);
                break;
            case 2:
            case 3:
                $('#selectMasts .selector').attr('disabled', false);
                $('#selectMasts input').prop('disabled', false);
                $('#allMastSwitch').attr('disabled', checked.length === 3);
                $('#allMastSwitch input').prop('disabled', checked.length === 3).prop('checked', checked.length === 3);
                break;
            default:
                assert(false, "Checkbox misconfiguration: " + checked.length);
        }
        if (Questionary.status === Questionary.ASKED) {
            input = Questionary.correctAnswer.mast.name ? $('#selectMasts :contains("' + Questionary.correctAnswer.mast.name + '") input') : [];
            if (!input.length || !input.prop('checked')) {
                Questionary.askQuestion();
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
    switch(setMode.mode) {
        case setMode.INFO:
            Questionary.status = null;
            break;
        case setMode.DEMO:
            $('#overlay, #sublines').addClass('highlight'); // ToDo: use pre-set selection variable
            $('.point, .subline').removeClass('on question rightAnswer wrongAnswer');
            Questionary.status = Questionary.ASKED;
            Point.toggleTooltips(true);
            if (Questionary.lastEntered) {
                Questionary.lastEntered.mouseenter();
                Questionary.lastEntered = null;
            }
            break;
        case setMode.WHERE:
            var line;
            while (true) {
                line = Line.lines.random();
                if ((line.mast.checkbox || Mast.allCheckbox).prop('checked') &&
                    (!Questionary.correctAnswer || line.name != Questionary.correctAnswer.name)) {
                    break;
                }
            }
            Questionary.correctAnswer = line;
            $('#question').text(Questionary.correctAnswer.name);
            $('#overlay, #pointNumbers').addClass('highlight'); // ToDo: use pre-set selection variable
            $('.point, .pointNumber').removeClass('on question rightAnswer wrongAnswer');
            $('#rightAnswer, #wrongAnswer, #nextQuestionNote').hide();
            $('#tooltipNote').show();
            Questionary.status = Questionary.ASKED;
            Point.toggleTooltips(false);
            break;
        case setMode.WHICH:
            var point;
            while (true) {
                point = Point.points.random();
                if (point.deck.checkbox.prop('checked') &&
                    (!Questionary.correctAnswer || point.location != Questionary.correctAnswer.location)) {
                    break;
                }
            }
            Questionary.correctAnswer = point;
            $('#question').text(Questionary.correctAnswer.location);
            Point.locationObject.removeClass('highlight pointer');
            $('#sublines').addClass('highlight');
            $('.point, .subline').removeClass('on question rightAnswer wrongAnswer');
            $('.preAnswer').removeClass('preAnswer');
            point.iconObject.addClass('question');
            $('#rightAnswer, #wrongAnswer, #nextQuestionNote').hide();
            $('#tooltipNote').show();
            Questionary.status = Questionary.ASKED;
            Questionary.preAnswer = null;
            Point.toggleTooltips(false);
            break;
        default:
            assert(false, "Unknown mode: " + setMode.mode);
    }
};

Questionary.answerQuestion = function (event) {
    assert(this === event.target, "Event delegation error, expected " + event.target + " but got " + this);
    assert(event.data, "Event data is not specified");
    if (Questionary.status !== Questionary.ASKED) {
        return;
    }
    event.stopPropagation(); // Avoid triggering nextQuestion()
    var isCorrect;
    switch(setMode.mode) {
        case setMode.DEMO:
            Questionary.status = Questionary.ANSWERED;
            return;
        case setMode.WHERE:
            var point = event.data;
            point.objects.removeClass('on');
            $.each(Point.points, function (_index, point) {
                $.each(point.lines, function (_index, line) {
                    if (line.name === Questionary.correctAnswer.name) {
                        point.objects.addClass('rightAnswer');
                    }
                });
            });
            $.each(point.lines, function (_index, line) {
                if (line.name === Questionary.correctAnswer.name) {
                    isCorrect = true;
                }
            });
            if (!isCorrect) {
                point.objects.addClass('wrongAnswer');
                $('#rightAnswerText').text(point.name);
            }
            break;
        case setMode.WHICH:
            var subline = event.data;
            if (!(subline instanceof Subline)) {
                return;
            }
            var points;
            if (Questionary.preAnswer) {
                Questionary.preAnswer.object.removeClass('preAnswer');
            }
            if (subline.sublineType === Subline.NONSAILLINE) {
                Questionary.preAnswer = null;
                points = subline.points;
            } else {
                if (!Questionary.preAnswer && subline.sublines.length === 1) {
                    Questionary.preAnswer = subline.sublines[0];
                }
                if (!Questionary.preAnswer || subline.sublineType === Questionary.preAnswer.sublineType) {
                    Questionary.preAnswer = subline;
                    subline.object.addClass('preAnswer');
                    return;
                }
                points = subline.points.filter(function (value) {
                    return Questionary.preAnswer.points.indexOf(value) >= 0;
                });
            }
            isCorrect = points.indexOf(Questionary.correctAnswer) >= 0;
            subline.object.mouseout();
            Point.locationObject.addClass('highlight');
            Questionary.correctAnswer.iconObject.addClass('rightAnswer');
            $.each(Questionary.correctAnswer.lines, function (_index, correctLine) {
                $.each(correctLine.sublines, function (_index, correctSubline) {
                    correctSubline.object.addClass('rightAnswer');
                });
            });
            if (!isCorrect) {
                $.each(points, function (_index, point) {
                    point.iconObject.addClass('wrongAnswer');
                });
                subline.object.addClass('wrongAnswer');
                if (Questionary.preAnswer) {
                    Questionary.preAnswer.object.addClass('wrongAnswer');
                }
                $('#rightAnswerText').text(Questionary.correctAnswer.name);
            }
            Questionary.status = Questionary.ANSWERED;
            break;
        default:
            assert(false, "Unknown mode: " + setMode.mode);
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
    Point.toggleTooltips(true);
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

Questionary.reset = function () {
    Questionary.statAll = Questionary.statCorrect = 0;
    $('#statistics').hide();
};

function main() {
    // Create data objects from constant data
    Deck.construct();
    Line.construct();
    Subline.construct();
    // Configure and link data objects
    Deck.createObjects();
    Line.linkLines();
    // Put generated objects to DOM
    Deck.placeObjects();
    Mast.placeObjects();
    Point.placeObjects();
    // Setup scheme
    $('img.scheme').css({ width: SCHEME_WIDTH, height: SCHEME_HEIGHT });
    Point.locationObject.css({ width: SCHEME_WIDTH, height: 2 * SCHEME_HEIGHT });
    onResize.scheme = $('#scheme');
    onResize.placeholder = $('#placeholder');
    setMode.schemeBlock = $('#schemeBlock');
    // Binding to fixed DOM elements for setMode()
    setMode.mastMasks = $('.mastMask');
    setMode.deckMasks = $('.deckMask');
    setMode.allDependents = $('.modeDependent');
    setMode.schemeSelector = $('#schemeSwitch');
    setMode.schemeCheckbox = $('input', setMode.schemeSelector);
    setMode.marksSelector = $('#marksSwitch');
    setMode.marksCheckbox = $('input', setMode.marksSelector);
    setMode.whereLocationObjects = Point.locationObject.add(Deck.locationObject);
    $.each([setMode.INFO, setMode.DEMO, setMode.WHERE, setMode.WHICH], function (_index, mode) {
        setMode.checkboxes[mode] = $('#' + mode + 'ModeSwitch input');
        setMode.dependents[mode] = $('.usedInMode' + mode.capitalize());
    });
    // Binding events for setMode()
    setMode.schemeCheckbox.prop('checked', true).change(function (_event) {
        setMode.schemeBlock.toggle(this.checked);
        if (this.checked) {
            Questionary.reset();
        }
        if (setMode.mode === setMode.WHICH) {
            setMode.marksSelector.toggle(this.checked);
        }
    });
    setMode.marksCheckbox.prop('checked', true).change(function (_event) {
        setMode.whereLocationObjects.toggleClass('colored', this.checked);
        if (this.checked) {
            Questionary.reset();
        }
    }).change();
    $('.selector').click(menuHandler);
    $('#allMastSwitch, #allDeckSwitch').click();
    $('#resetButton').click(Questionary.reset);
    $('.selector, .point, .pointNumber, .subline').mousedown(function (_event) { return false; }); // Avoid selection by double-click
    $('body').click(Questionary.nextQuestion);
    $('button.info').on('hover mousedown keydown', function (_event) { return false; });
    // Finishing setup
    setMode(window.location.hash);
    onResize();
    $('#loading').hide();
    $('#main').show();
    $(window).resize(onResize);
}

$(document).ready(main);
