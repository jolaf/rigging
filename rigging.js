/* jshint strict: global */
/* globals $, document, window, PORT, CENTER, DECKS, RAILS, LINES, DETAIL_LINE, LINE_DETAIL, SINGULAR, PLURAL, CLEWLINE, BUNTLINE, LEECHLINE, BOWLINE */
"use strict";

var scheme;

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

function Point(deck, side, rail, index, element) {
    assert(deck, "No deck for a Point");
    this.deck = deck;
    assert(side, "No side for a Point");
    this.side = side;
    assert(rail, "No rail for a Point");
    this.rail = rail;
    this.number = index + 1;
    this.iconObject = $(element);
    this.lines = [];
    Point.points.push(this);
}

Point.construct = function () {
    Point.points = [];
    Point.marks = {};
    Point.marks[ CLEWLINE] = 'clewline';
    Point.marks[ BUNTLINE] = 'buntline';
    Point.marks[LEECHLINE] = 'leechline';
    Point.marks[  BOWLINE] = 'bowline';
    Point.locationObject = $('#points', scheme);
};

Point.prototype.createObject = function () {
    // Setting location, we can't do it in the constructor, as this.rail has not been constructed yet as in there
    this.location = this.rail.location;
    if (this.rail.direction) {
        var number;
        var direction;
        if (this.number <= this.rail.centerNumber) {
            number = this.number;
            direction = (number === this.rail.centerNumber) ? '' : (' ' + this.rail.direction);
        } else {
            number = this.rail.points.length + 1 - this.number;
            direction = ' ' + this.rail.reverseDirection;
        }
        this.location += ', ' + number  + '-' + (this.rail.isRail ? 'й' : 'ая') + direction;
    }
    // Constructing point name from names of connected lines
    assert(this.lines.length, "No lines for Point " + this.location);
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
    // Connecting similarly named lines and points
    var thisPoint = this;
    var thisLines = this.lines;
    $.each(Line.lines, function (_index, line) {
        if (thisLines.indexOf(line) < 0) {
            $.each(thisLines, function (_index, thisLine) {
                if (line.name === thisLine.name) {
                    thisLines.push(line);
                    if (line.points.indexOf(thisPoint) < 0) {
                        line.points.push(thisPoint);
                    }
                }
            });
        }
    });
    // Configuring HTML objects
    this.numberObject = $('<a class="pointNumber">' + ((this.rail.points.length === 1) ? 'I' : this.number) + '</a>');
    this.objects = this.iconObject.add(this.numberObject);
    this.objects.attr('tipsy-title', this.name);
    this.objects.addClass(this.lines.map(function (line) { return Point.marks[line.lineName]; }).join(' '));
    // Setting event handlers
    this.objects.on('click', this, Questionary.answerQuestion);
    this.objects.on('mouseenter mouseleave', this, this.mouseHandler);
    return this.numberObject;
};

Point.prototype.attachLine = function (line) {
    this.lines.push(line);
};

Point.toggleTooltips = function (enable) {
    $.each(Point.points, function (_index, point) {
        point.objects.attr('tipsy-title', enable ? point.name : '');
    });
};

Point.prototype.mouseHandler = function (event) {
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

function Rail(deckID, side, id, isAcross, ignoreDeck, children) {
    this.deck = Deck.getDeck(deckID);
    assert(side, "Unknown side: " + side);
    this.side = side;
    assert(id, "No ID for a Rail");
    this.id = id;
    this.name = RAILS[id];
    assert(this.name, "Unknown rail name: " + id);
    this.isRail = id.toLowerCase().endsWith('rail');
    this.isAcross = isAcross;
    this.location = (ignoreDeck ? this.name.capitalize() : (this.deck.title.capitalize() + ', ' + this.name)) +
        (side !== CENTER ? (', по ' + (side === PORT ? 'левому' : 'правому') + ' борту') : '');
    assert(children.length, "No children in Rail " + this.name);
    if (children.length === 1) {
        this.direction = this.reverseDirection = this.centerNumber = null;
    } else {
        this.direction =  isAcross ? 'от центра' : 'с кормы';
        this.reverseDirection = isAcross ? 'с краю' : 'с носа';
        this.centerNumber = (children.length + 1) / 2;
    }
    var deck = this.deck;
    var rail = this;
    this.points = children.map(function (index, element) {
        return applyNew(Point, [deck, side, rail, index, element]);
    }).toArray();
}

Rail.construct = function () {
    var uniqueRails = [];
    this.rails = $('[rigging\\:rail]', scheme).map(function (_index, rail) {
        rail = $(rail);
        var args = ['deck', 'side', 'rail', 'isAcross', 'ignoreDeck'].map(function(attr) {
            return rail.attr('rigging:' + attr) || false;
        }).concat([rail.children(),]);
        rail = applyNew(Rail, args);
        assert($.inArray(rail.location, uniqueRails) < 0, "Duplicate Rail location: " + rail.location);
        uniqueRails.push(rail.location);
        Deck.getDeck(args[0]).rails.push(rail);
        return rail;
    }).toArray();
    assert(this.rails.length, "No rails found in SVG scheme image");
    RAILS = null; // jshint ignore:line
};

Rail.attachLine = function (deckName, railID, assym, number, line) {
    assert(line, "No line to attach to a Deck");
    var rails = this.rails.filter(function (rail) {
        return rail.deck.name === deckName && rail.id === railID && (!assym || assym === rail.side);
    });
    assert(rails.length >= 1, "Unknown rail to attach: " + deckName + "/" + railID + "/" + assym);
    assert(rails.length <= 2, "Too many rails to attach: " + deckName + "/" + railID + "/" + assym + " (" + rails.length + ")");
    var points = [];
    $.each(rails, function (_index, rail) {
        points.push(rail.attachLine(number, line));
    });
    return points;
};

Rail.prototype.attachLine = function (number, line) {
    if (!number) {
        number = 1;
    } else if (number < 0) {
        number += this.points.length + 1;
    }
    var point = this.points[number - 1];
    assert(point, "Bad point number: " + number);
    line.number = number;
    point.attachLine(line);
    return point;
};

Rail.prototype.createObject = function (existingObject) {
    var object = existingObject || $('<li class="rail"><span class="rail">' + this.name + '</span>: <span class="points"></span></li>').data('name', this.name);
    var pointsObject = $('span.points', object);
    var adder = ((this.side === PORT && this.isAcross) ? pointsObject.prepend : pointsObject.append);
    var insertContent = function (content) {
        adder.call(pointsObject, content);
    };
    if (pointsObject.children().length) {
        insertContent('&nbsp;&nbsp;');
    }
    $.each(this.points, function (_index, point) {
        insertContent(' ');
        insertContent(point.createObject());
    });
    return object;
};

function Selectable(tag, instances, strict) {
    this.tag = tag;
    this.instances = instances;
    this.strict = strict;
    this.masks = null;
    this.checkboxes = null;
    this.selectors = null;
    this.allCheckbox = null;
    this.allSelector = null;
    this.singularSelectors = null;
    this.number = null;
}

Selectable.prototype.placeObject = function (instance) {
    instance.checkbox = $('.selector [name="' + this.tag + '"].' + instance.id);
    if (this.strict) {
        assert(instance.checkbox.length === 1, this.tag.capitalize() + " checkbox not found: " + instance.name + " / " + instance.id);
    }
    var mask = $('.' + this.tag + 'Mask[rigging\\:' + this.tag + '=' + instance.id + ']', scheme);
    if (instance.checkbox.length) {
        assert(mask.length === 1, this.tag.capitalize() + " mask not found: " + instance.name + " / " + instance.id);
        instance.checkbox.data('mask', mask);
    } else {
        instance.checkbox = this.allCheckbox;
    }
    if (instance.placeObject) {
        instance.placeObject();
    }
};

Selectable.prototype.placeObjects = function () {
    this.masks = $('.' + this.tag + 'Mask', scheme);
    this.checkboxes = $('.selector [name="' + this.tag + '"]');
    this.selectors = this.checkboxes.parent('.selector');
    this.allCheckbox = $('.selector [name="' + this.tag + '"].all');
    this.allSelector = this.allCheckbox.parent('.selector');
    assert(this.allSelector.length === 1, "All " + this.tag + "s selector not found");
    this.singularSelectors = $('.selector [name="' + this.tag + '"]:not(.all)').parent('.selector');
    this.number = this.singularSelectors.length;
    assert(this.number > 2 &&
           this.masks.length === this.number &&
           this.selectors.length === this.number + 1 &&
           this.checkboxes.length === this.number + 1,
        this.tag.capitalize() + " configuration inconsistency");
    var thisSelectable = this;
    $.each(this.instances, function (_index, instance) {
        thisSelectable.placeObject(instance);
    });
};

Selectable.prototype.menuHandler = function (checkbox, answer) {
    var id = checkbox.prop('class');
    if (id === 'all') {
        this.masks.hide();
        this.checkboxes.prop('checked', true);
    } else {
        checkbox.data('mask').toggle(!checkbox.prop('checked'));
    }
    var checked = $('input:checked', this.singularSelectors);
    assert(1 <= checked.length <= this.number, this.tag.capitalize() + " checkbox misconfiguration: " + checked.length);
    var isAll = checked.length === this.number;
    if (checked.length === 1) {
        checked.parent().attr('disabled', true);
        checked.prop('disabled', true);
    } else {
        this.selectors.attr('disabled', false);
        this.checkboxes.prop('disabled', false);
        this.allSelector.attr('disabled', isAll);
        this.allCheckbox.prop('disabled', isAll).prop('checked', isAll);
    }
    if (Questionary.status === Questionary.ASKED && !Questionary.rightAnswer[this.tag].checkbox.prop('checked')) {
        Questionary.askQuestion();
    }
};

function Deck(name, id, title, rails) {
    assert(name, "No name for a Deck");
    this.name = name;
    assert(id, "No ID for Deck " + name);
    this.id = id;
    assert(title, "No title for Deck " + name);
    this.title = title;
    this.rails = [];
}

Deck.construct = function () {
    Deck.locationObject = null;
    var uniqueNames = [];
    Deck.decks = DECKS.map(function (deckArgs) {
        var deck = applyNew(Deck, deckArgs);
        assert($.inArray(deck.name, uniqueNames) < 0, "Duplicate deck name: " + deck.name);
        uniqueNames.push(deck.name);
        return deck;
    });
    DECKS = null; // jshint ignore:line
    Deck.selectable = new Selectable('deck', Deck.decks, true);
    Deck.locationObject = $('#pointNumbers');
};

Deck.getDeck = function (deckID) {
    var decks = Deck.decks.filter(function (deck) { return deck.id === deckID; });
    assert(decks.length === 1, "Unknown deck: " + deckID);
    return decks[0];
};

Deck.prototype.createObject = function () {
    var object =  $('<td class="deck"><h2>' + this.title.capitalize() + '</h2><ul></ul></td>');
    var ul = $('ul', object);
    $.each(this.rails, function (_index, rail) {
        var existingObject = ul.children().filter(function (_index, otherRail) {
            return $(otherRail).data('name') === rail.name;
        });
        assert(existingObject.length <= 1, "Too many rails named " + rail.name + " (" + existingObject.length + ")");
        ul.append(rail.createObject(existingObject.length ? existingObject : null));
    });
    Deck.locationObject.prepend(object);
};

Deck.placeObjects = function () {
    $.each(Deck.decks, function (_index, deck) {
        deck.createObject();
    });
    Deck.selectable.placeObjects();
};

function Line(mastName, mastID, sailName, deckName, railName, number, lineName, detail, assym, fullName, pluralName) {
    this.points = Rail.attachLine(deckName, railName, assym, number, this); // Also sets this.number
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
            pluralWords = fullNameWords.map(russianPlural);
            break;
        case LINE_DETAIL:
            fullNameWords = this.detail ? [this.lineName, russianGenetive(this.detail)] : [this.lineName,];
            pluralWords = fullNameWords.slice(0, 1).map(russianPlural).concat(fullNameWords.slice(1));
            break;
        case '': // GRAMMAR
            fullNameWords = (this.detail ? [this.detail,] : []).concat([this.lineName,]).concat((this.sail.name || this.mast.name) ? [this.sail.name || this.mast.name,] : []);
            fullNameWords = fullNameWords.slice(0, 1).concat(fullNameWords.slice(1).map(russianGenetive));
            pluralWords = fullNameWords.slice(0, -1).map(russianPlural).concat(fullNameWords.slice(-1));
            pluralWords = pluralWords.slice(0, 1).concat(pluralWords.slice(1, -1).map(russianGenetive)).concat(pluralWords.slice(-1));
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
    if (assym) {
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
    LINES = null; // jshint ignore:line
};

Line.linkLines = function () {
    $.each(Line.lines, function (_index, line) {
        var demoElements = [];
        var whereElements = [];
        var whichElements = [];
        line.sublines = Subline.getSublines(line);
        $.each(line.sublines, function (_index, subline) {
            demoElements.push(subline.object[0]);
            whichElements.push(subline.object[0]);
        });
        $.each(line.points, function (_index, point) {
            demoElements.push(point.iconObject[0]);
            whereElements.push(point.iconObject[0]);
            whereElements.push(point.numberObject[0]);
        });
        line.demoObjects = $($.uniqueSort(demoElements));
        line.whereObjects = $($.uniqueSort(whereElements));
        line.whichObjects = $($.uniqueSort(whichElements));
    });
    $.each(Point.points, function (_index, point) {
        var demoElements = [];
        var whereElements = [];
        var whichElements = [point.iconObject[0],];
        $.each(point.lines, function (_index, line) {
            Array.prototype.push.apply(demoElements, line.demoObjects.toArray());
            Array.prototype.push.apply(whereElements, line.whereObjects.toArray());
            Array.prototype.push.apply(whichElements, line.whichObjects.toArray());
        });
        point.demoObjects = $($.uniqueSort(demoElements));
        point.whereObjects = $($.uniqueSort(whereElements));
        point.whichObjects = $($.uniqueSort(whichElements));
    });
    $.each(Subline.sublines, function (_index, subline) {
        var demoElements = [];
        $.each(subline.lines, function (_index, line) {
            Array.prototype.push.apply(demoElements, line.demoObjects.toArray());
        });
        subline.demoObjects = $($.uniqueSort(demoElements));
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

Mast.construct = function () {
    Mast.masts = [];
    Mast.selectable = new Selectable('mast', Mast.masts);
};

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

Subline.construct = function () {
    Subline.SAIL = 'SAIL';
    Subline.SAILLINE = 'SAILLINE';
    Subline.NONSAILLINE = 'NONSAILLINE';
    var uniqueNames = [];
    Subline.sublines = [];
    Subline.locationObject = $('#sublines');
    Subline.locationObject.children().each(function (_index, group) {
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
            assert($.inArray(subline.name, uniqueNames) < 0, "Duplicate subline name: " + subline.name);
            uniqueNames.push(subline.name);
            Subline.sublines.push(subline);
            if (sublineType === Subline.SAIL) {
                object.text(russianGenetive(subline.name));
            }
        });
    });
};

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

Subline.prototype.mouseHandler = function (event) {
    assert(this === event.target, "Event delegation error, expected " + this + " but got " + event.target);
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

function setMode(mode) {
    mode = mode.trim();
    mode = (mode.startsWith('#') ? mode.slice(1).trim() : mode).toLowerCase();
    if (mode === setMode.mode) {
        return;
    }
    var modeCheckbox = setMode.checkboxes[mode];
    if (!modeCheckbox) {
        mode = setMode.INFO;
        modeCheckbox = setMode.checkboxes[mode];
    }
    assert(modeCheckbox.length === 1, "Mode checkbox not found");
    setMode.mode = mode;
    window.location.href = '#' + mode;
    modeCheckbox.prop('checked', true);
    setMode.allDependents.hide();
    setMode.dependents[mode].show(); // Sorry, no way to do it simple and fast in one cycle
    Questionary.allObjects.hide();
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

setMode.construct = function () {
    setMode.INFO = 'info';
    setMode.DEMO = 'demo';
    setMode.WHERE = 'where';
    setMode.WHICH = 'which';
    setMode.checkboxes = {};
    setMode.dependents = {};
    setMode.schemeSelector = null;
    setMode.schemeCheckbox = null;
    setMode.mode = null;
};

setMode.configure = function () {
    setMode.schemeBlock = $('#schemeBlock');
    setMode.allDependents = $('.modeDependent');
    setMode.schemeCheckbox = $('#schemeCheckbox');
    setMode.marksCheckbox = $('#marksCheckbox');
    setMode.marksSelector = setMode.marksCheckbox.parent();
    setMode.whereLocationObjects = Point.locationObject.add(Deck.locationObject);
    $.each([setMode.INFO, setMode.DEMO, setMode.WHERE, setMode.WHICH], function (_index, mode) {
        setMode.checkboxes[mode] = $('.selector [name="mode"].' + mode);
        setMode.dependents[mode] = $('.modeDependent.' + mode);
    });
    setMode.schemeCheckbox.prop('checked', true).change(setMode.schemeHandler);
    setMode.marksCheckbox.prop('checked', true).change(setMode.marksHandler).change();
};

setMode.schemeHandler = function () {
    setMode.schemeBlock.toggle(this.checked);
    if (this.checked) {
        Questionary.reset();
    }
    if (setMode.mode === setMode.WHICH) {
        setMode.marksSelector.toggle(this.checked);
    }
};

setMode.marksHandler = function () {
    setMode.whereLocationObjects.toggleClass('colored', this.checked);
    if (this.checked) {
        Questionary.reset();
    }
};

function menuHandler(event) {
    var checkbox = $('input', $(this)); // jshint ignore:line
    if (this === event.target) { // jshint ignore:line
        checkbox.click();
        return;
    }
    var name = checkbox.prop('name');
    if (name === 'mode') {
        setMode(checkbox.prop('class'));
        return;
    }
    if (checkbox.prop('checked')) {
        Questionary.reset();
    }
    if (name === 'deck') {
        Deck.selectable.menuHandler(checkbox);
    } else if (name === 'mast') {
        Mast.selectable.menuHandler(checkbox);
    }
}

function Questionary() {
    // Static container
}

Questionary.construct = function () {
    Questionary.ASKED = 'ASKED';
    Questionary.ANSWERED = 'ANSWERED';
    Questionary.rightAnswer = null;
    Questionary.preAnswer = null;
    Questionary.status = null;
    Questionary.statAll = 0;
    Questionary.statCorrect = 0;
    Questionary.lastEntered = null;
};

Questionary.configure = function () {
    Questionary.highlightClasses = 'on rightAnswer wrongAnswer';
    Questionary.demoLocationObjects = Point.locationObject.add(Subline.locationObject);
    Questionary.whereLocationObjects = Point.locationObject.add(Deck.locationObject);
    var pointObjects = $('>>', Point.locationObject);
    Questionary.demoObjects = pointObjects.add('.subline');
    Questionary.whereObjects = pointObjects.add('.pointNumber');
    Questionary.questionObject = $('#question');
    Questionary.rightAnswerObject = $('#rightAnswer');
    Questionary.rightAnswerTextObject = $('#rightAnswerText');
    Questionary.wrongAnswerObject = $('#wrongAnswer');
    Questionary.tooltipNoteObject = $('#tooltipNote');
    Questionary.nextQuestionNoteObject = $('#nextQuestionNote');
    Questionary.nextQuestionButton = $('#nextQuestionButton')[0];
    Questionary.statCorrectObject = $('#statCorrect');
    Questionary.statAllObject = $('#statAll');
    Questionary.statPercentObject = $('#statPercent');
    Questionary.statisticsObject = $('#statistics');
    Questionary.answerObjects = Questionary.rightAnswerObject.add(Questionary.wrongAnswerObject).add(Questionary.nextQuestionNoteObject);
    Questionary.allObjects = Questionary.answerObjects.add(Questionary.statisticsObject);
};

Questionary.askQuestion = function () {
    switch(setMode.mode) {
        case setMode.INFO:
            Questionary.status = null;
            break;
        case setMode.DEMO:
            Questionary.demoObjects.removeClass(Questionary.highlightClasses);
            Point.toggleTooltips(true);
            Questionary.status = Questionary.ASKED;
            if (Questionary.preAnswer) {
                Questionary.preAnswer.object.removeClass('preAnswer');
                Questionary.preAnswer = null;
            }
            if (Questionary.lastEntered) {
                Questionary.lastEntered.mouseenter();
                Questionary.lastEntered = null;
            }
            break;
        case setMode.WHERE:
            var line;
            while (true) {
                line = Line.lines.random();
                if (line.mast.checkbox.prop('checked') &&
                    (!Questionary.rightAnswer || line.name != Questionary.rightAnswer.name)) {
                    break;
                }
            }
            Questionary.rightAnswer = line;
            Questionary.questionObject.text(Questionary.rightAnswer.name);
            Questionary.whereObjects.removeClass(Questionary.highlightClasses);
            Questionary.answerObjects.hide();
            Questionary.tooltipNoteObject.show();
            Point.toggleTooltips(false);
            Questionary.status = Questionary.ASKED;
            break;
        case setMode.WHICH:
            var point;
            while (true) {
                point = Point.points.random();
                if (point.deck.checkbox.prop('checked') &&
                    (!Questionary.rightAnswer || point.location != Questionary.rightAnswer.location)) {
                    break;
                }
            }
            Questionary.rightAnswer = point;
            Questionary.questionObject.text(Questionary.rightAnswer.location);
            Questionary.demoObjects.removeClass(Questionary.highlightClasses);
            point.iconObject.addClass('on');
            Questionary.answerObjects.hide();
            Questionary.tooltipNoteObject.show();
            Point.toggleTooltips(false);
            Questionary.status = Questionary.ASKED;
            if (Questionary.preAnswer) {
                Questionary.preAnswer.object.removeClass('preAnswer');
                Questionary.preAnswer = null;
            }
            break;
        default:
            assert(false, "Unknown mode: " + setMode.mode);
    }
};

Questionary.answerQuestion = function (event) {
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
            Questionary.rightAnswer.whereObjects.addClass('rightAnswer');
            isCorrect = point.lines.indexOf(Questionary.rightAnswer) >= 0;
            if (!isCorrect) {
                point.objects.addClass('wrongAnswer');
                Questionary.rightAnswerTextObject.text(point.name);
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
            isCorrect = points.indexOf(Questionary.rightAnswer) >= 0;
            subline.object.mouseout();
            Questionary.rightAnswer.whichObjects.addClass('rightAnswer');
            if (!isCorrect) {
                $.each(points, function (_index, point) {
                    point.iconObject.addClass('wrongAnswer');
                });
                subline.object.addClass('wrongAnswer');
                if (Questionary.preAnswer) {
                    Questionary.preAnswer.object.addClass('wrongAnswer');
                }
                Questionary.rightAnswerTextObject.text(Questionary.rightAnswer.name);
            }
            break;
        default:
            assert(false, "Unknown mode: " + setMode.mode);
    }
    Questionary.status = Questionary.ANSWERED;
    Questionary.updateStatistics(isCorrect);
    Questionary.rightAnswerObject.toggle(isCorrect);
    Questionary.wrongAnswerObject.toggle(!isCorrect);
    Questionary.tooltipNoteObject.hide();
    Questionary.nextQuestionNoteObject.show();
    Point.toggleTooltips(true);
};

Questionary.updateStatistics = function (isCorrect) {
    Questionary.statAll += 1;
    Questionary.statCorrect += isCorrect ? 1 : 0;
    Questionary.statCorrectObject.text(Questionary.statCorrect);
    Questionary.statAllObject.text(Questionary.statAll);
    Questionary.statPercentObject.text(Math.round(Questionary.statCorrect / Questionary.statAll * 100));
    Questionary.statisticsObject.show();
};

Questionary.nextQuestion = function (event) {
    if (Questionary.status === Questionary.ANSWERED) {
        Questionary.askQuestion();
    } else if (Questionary.status === Questionary.ASKED && event.target === Questionary.nextQuestionButton) {
        Questionary.updateStatistics();
        Questionary.askQuestion();
    }
};

Questionary.reset = function () {
    Questionary.statAll = Questionary.statCorrect = 0;
    Questionary.statisticsObject.hide();
};

function setupSVG(selector, callback) {
    var svg = $(selector + ' svg'); // Try accessing inline SVG
    if (!svg.length) { // For unbuilt project, use AJAX to load the SVG image inline, as <object> works badly in Chrome
        var svgObject = $(selector + ' object');
        if (svgObject.length) {
            var parent = svgObject.parent();
            var url = svgObject.attr('data');
            svgObject.remove(); // To avoid repeated attempts
            parent.load(url, function () {
                setupSVG(selector, callback);
            });
            return;
        }
    }
    assert(svg.length === 1, "SVG image not accessible");
    callback(svg);
}

function setupScheme(svg) {
    scheme = svg;
    $('*', scheme).removeAttr('display');
    start();
}

function start() {
    // Creating data objects from constant data
    Point.construct();
    Deck.construct();
    Rail.construct();
    Mast.construct();
    Line.construct();
    Subline.construct();
    Questionary.construct();
    setMode.construct();
    // Cross-linking data objects
    Deck.placeObjects();
    Mast.selectable.placeObjects();
    Line.linkLines();
    // Configuring engine
    Questionary.configure();
    setMode.configure();
    // Binding menu handlers
    $('.selector').on('click firefoxWorkaround', menuHandler);
    Deck.selectable.allCheckbox.trigger('firefoxWorkaround');
    Mast.selectable.allCheckbox.trigger('firefoxWorkaround');
    // Binding other handlers
    $('#resetButton').click(Questionary.reset);
    $('.selector, .point, .pointNumber, .subline').mousedown(false); // Avoid selection by double-click
    $('body').add(scheme).click(Questionary.nextQuestion);
    $('button.doc').on('hover mousedown keydown', false);
    // Setup tooltips
    Questionary.whereObjects.tipsy({title: 'tipsy-title', gravity: $.fn.tipsy.autoBounds(300, 'nw'), offset: 5, opacity: 1});
    // Starting up
    setMode(window.location.hash);
    $('.loading').removeClass('loading');
}

function main() {
    if (window.jQuery) {
        $(document).ready(function () {
            setupSVG('#filters', function () {
                setupSVG('#schemeBlock', setupScheme);
            });
        });
    } else {
        window.setTimeout(main, 100);
    }
}

main();
