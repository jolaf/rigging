/* jshint elision: true */
/* jshint strict: global */
/* globals $, document, location, window */
  "use strict";

var SCHEME_WIDTH = 4339;
var SCHEME_HEIGHT = 670;

// Full name options
var GRAMMAR = null;
var DETAIL_LINE = 'DETAIL_LINE';
var LINE_DETAIL = 'LINE_DETAIL';

// Plural name options
var SINGULAR = 'SINGULAR';
var PLURAL = 'PLURAL';

// Fix point types
var PIN = 'pin';
var CLEAT = 'cleat';
var VCLEAT = 'vcleat';
var SCLEAT = 'scleat';
var FIST = 'fist';
var KNOT = 'knot';
var VANG_TACKLE = 'vang';

// Decks
var FORE_DECK = 'Бак';
var MAIN_DECK = 'Главная';
var STERN_DECK = 'ПолуЮт';

var IGNORE_DECK = 'IGNORE';

// Masts
var BOWSPRIT = 'Бушприт';
var FORE_MAST = 'Фок';
var MAIN_MAST = 'Грот';
var MIZZEN_MAST = 'Бизань';
var FLAG_STAFF = 'Флагшток';

// Sails
var SPRIT_SAIL = 'Блинд';
var FORE_SAIL = 'Фок';
var FORE_TOPSAIL = 'Фор-марсель';
var FORE_GALLANT = 'Фор-брамсель';
var MAIN_SAIL = 'Грот';
var MAIN_TOPSAIL = 'Грот-марсель';
var MAIN_GALLANT = 'Грот-брамсель';
var STAY_SAIL = 'Стаксель';
var MIZZEN_STAYSAIL = 'Апсель';
var MIZZEN_SAIL = 'Бизань';
var MIZZEN_TOPSAIL = 'Крюйс-марсель';

// Line types
var BRACE = 'Брас';
var LIFT = 'Топенант';
var TOPPING_LIFT = 'Дирик-фал';
var TACK_TACKLE = 'Галс-таль';
var VANG = 'Эренс-бакштаг';

var SHEET = 'Шкот';
var TACK = 'Галс';
var BOWLINE = 'Булинь';
var DOWNHAULER = 'Нирал';
var HALYARD = 'Фал';

var CLEWLINE = 'Гитов';
var LEECHLINE = 'Нок-гордень';
var BUNTLINE = 'Бык-гордень';

var FLAG_HALYARD = 'Флаг-фал';
var TACKLE = 'Талёва';
var MOORING_ROPE = 'Швартов';
var DINGHY_BOWLINE = 'Носовой шлюпки';

// Details
var COIL = 'Бухта';
var MIZZEN_YARD = 'Рю';
var CROSS_JACK = 'Бегин-рей';

// Sides
var PORT = 'PORT';
var STARBOARD = 'STARBOARD';
var CENTER = 'CENTER';

// Rail locations
var FRONT_RAIL = 'на планке спереди';
var BACK_RAIL = 'на планке сзади';
var SIDE_RAIL = 'на планке у борта';
var SHROUDS_RAIL = 'на планке на вантах';

var SIDE_MAST_RAIL = 'сбоку от мачты, на планке';
var BEHIND_MAST_RAIL = 'позади мачты, на планке';

var FRONT_FISTS = 'перед мачтой, на кулаках';
var BACK_FISTS = 'позади мачты, на кулаках';

var FRONT_PILLARS = 'перед мачтой, на пиллерсах';
var BACK_PILLARS = 'позади мачты, на пиллерсах';

var AT_MAST = 'на мачте';
var AT_MAST_FRONT = 'на мачте спереди';
var AT_MAST_SIDE = 'на мачте сбоку';
var AT_MAST_BACK = 'на мачте сзади';

var AT_FRONT = 'спереди';
var BEHIND_FRONT = 'за планкой спереди';
var BULWARK = 'на фальшборту';
var ABOVE_RAIL = 'над планкой у борта';
var ON_DECK_FRONT = 'перед мачтой, на палубе';
var ABOVE_LADDER = 'над трапом';

var POOP_BULWARK = 'на юте, на фальшборту';
var POOP_FLAGSTAFF = 'на юте, на флагштоке';

var FREE = 'свободный нагель';

var DECKS = [
  // Deck        Title
    [FORE_DECK, 'На баке', [
      // Rail                Assym        X0   Y0 stepX    stepY  N  Type=PIN Rotation
        [FRONT_RAIL,         ,          4076,  22,     ,      75, 5], // 276
        [BEHIND_FRONT,       ,          4112, 101,     ,,, CLEAT, 90],
        [BACK_RAIL,          ,          3255, 119,     ,      75, 3],
        [SIDE_RAIL,          ,          3400, 399,   74,        , 8],
        [SHROUDS_RAIL,       ,          3523, 457,   63,        , 5],
        [ON_DECK_FRONT,      ,          3966, 340,     ,,, CLEAT],
        [FRONT_FISTS,        ,          3849, 115,     ,,,  FIST],
        [BACK_PILLARS,       ,          3541, 146,     ,,, CLEAT],
        [BEHIND_MAST_RAIL,   ,          3500,  23, [[,, PIN], [, 55, PIN], [, 174, PIN]]],
        [AT_MAST_FRONT,      CENTER,    3768, -11,     ,,, CLEAT],
        [AT_MAST_SIDE,       ,          3710,  85,     ,,, CLEAT, 75],
    ]],
    [MAIN_DECK, 'На главной палубе', [
      // Rail                Assym        X0   Y0  [[X  Y  Type=CLEAT Rotation], ...]
        [BULWARK,            ,          2543, 500, [[,, VCLEAT], [260, 50, SCLEAT, -3], [430, -25, VCLEAT, -6]]],
        [SIDE_RAIL,          ,          1854, 500,   53,       7, 6],
        [ABOVE_RAIL,         ,          1906, 567,     ,,, CLEAT, 8],
        [FRONT_PILLARS,      ,          2456, 324,     ,,, CLEAT],
        [ON_DECK_FRONT,      ,          2406, 265,     ,,, CLEAT],
        [BACK_FISTS,         ,          1880, 304,     ,,,  FIST],
        [BEHIND_MAST_RAIL,   ,          1889,  26,     ,      93, 3],
        [SIDE_MAST_RAIL,     ,          1968, 312,   69,        , 6],
        [AT_MAST_FRONT,      CENTER,    2261, -12,     ,,, CLEAT, 90],
        [AT_MAST_BACK,       CENTER,    2033, -12,     ,,, CLEAT, 90],
    ]],
    [STERN_DECK, 'На полуюте', [
        [AT_FRONT,           CENTER,    1607, -19,      ,,,  KNOT],
        [ABOVE_LADDER,       STARBOARD, 1750, 425,      ,,,  KNOT],
        [BULWARK,            ,           700, 490, [[,, SCLEAT, -45], [320, 25, SCLEAT, 105], [440, 27, SCLEAT, 80], [600, -3, VCLEAT]]],
        [SIDE_RAIL,          ,           800, 569,   43,       3, 4],
        [SHROUDS_RAIL,       ,           498, 569,   38,       6, 5],
        [AT_MAST,            ,           627,  52, [[,,, -40], [103, 44,, 90]]], // 632 587, 625 595 -40
        [POOP_BULWARK,       ,            30, 360, [[,, VANG_TACKLE], [60,, VCLEAT, 14], [280, 140,, 13]], IGNORE_DECK],
        [POOP_FLAGSTAFF,     ,            85,  25,      ,,, CLEAT, 60, IGNORE_DECK],
    ]]
];

var LINES = [
  // Mast/Sail/Deck      Rail          Point#  Line             Detail               Assym      Full Name                     Plural
    [BOWSPRIT, [
        [SPRIT_SAIL, [
            [FORE_DECK,  FRONT_RAIL,        4, BRACE],
            [FORE_DECK,  FRONT_RAIL,        3, LIFT],
            [FORE_DECK,  SIDE_RAIL,        -1, SHEET],
            [FORE_DECK,  BEHIND_FRONT,       , CLEWLINE],
            [FORE_DECK,  BEHIND_FRONT,       , BUNTLINE],
        ]],
    ]],
    [FORE_MAST, [
        [FORE_SAIL, [
            [FORE_DECK,  BACK_RAIL,         1, BRACE],
            [FORE_DECK,  BEHIND_MAST_RAIL,  3, LIFT],
            [MAIN_DECK,  BULWARK,           1, SHEET],
            [FORE_DECK,  FRONT_RAIL,       -1, TACK],
            [FORE_DECK,  FRONT_RAIL,        2, BOWLINE],
            [FORE_DECK,  AT_MAST_FRONT,      , DOWNHAULER,      ,                    CENTER,    ,                             PLURAL],
            [FORE_DECK,  SIDE_RAIL,        -2, CLEWLINE],
            [FORE_DECK,  SIDE_RAIL,         2, LEECHLINE],
            [FORE_DECK,  SIDE_RAIL,         1, BUNTLINE],
        ]],
        [FORE_TOPSAIL, [
            [FORE_DECK,  BACK_RAIL,         2, BRACE],
            [FORE_DECK,  BEHIND_MAST_RAIL,  2, LIFT],
            [FORE_DECK,  FRONT_FISTS,        , SHEET],
            [FORE_DECK,  AT_MAST_SIDE,       , SHEET,           COIL],
            [FORE_DECK,  FRONT_RAIL,        1, BOWLINE],
            [FORE_DECK,  SIDE_RAIL,         5, CLEWLINE],
            [FORE_DECK,  SIDE_RAIL,         4, LEECHLINE],
            [FORE_DECK,  SIDE_RAIL,         3, BUNTLINE],
        ]],
        [FORE_GALLANT, [
            [FORE_DECK,  BACK_RAIL,         3, BRACE],
            [FORE_DECK,  BEHIND_MAST_RAIL,  1, LIFT],
            [FORE_DECK,  SHROUDS_RAIL,     -1, SHEET],
            [FORE_DECK,  SHROUDS_RAIL,     -2, CLEWLINE],
            [FORE_DECK,  SHROUDS_RAIL,     -2, BUNTLINE],
        ]],
        [, [
            [FORE_DECK,  BACK_PILLARS,       , FLAG_HALYARD,    ,                    STARBOARD, ,                             PLURAL],
        ]],
    ]],
    [MAIN_MAST, [
        [MAIN_SAIL, [
            [STERN_DECK, BULWARK,           1, BRACE],
            [STERN_DECK, SHROUDS_RAIL,      1, BRACE,           COIL],
            [MAIN_DECK,  BEHIND_MAST_RAIL,  3, LIFT],
            [STERN_DECK, BULWARK,          -1, SHEET],
            [MAIN_DECK,  BULWARK,          -1, TACK],
            [FORE_DECK,  SHROUDS_RAIL,      2, BOWLINE],
            [MAIN_DECK,  FRONT_PILLARS,      , DOWNHAULER,      ,                    ,         ,                              PLURAL],
            [MAIN_DECK,  SIDE_MAST_RAIL,    3, CLEWLINE],
            [MAIN_DECK,  SIDE_MAST_RAIL,    2, LEECHLINE],
            [MAIN_DECK,  SIDE_MAST_RAIL,    1, BUNTLINE],
        ]],
        [MAIN_TOPSAIL, [
            [STERN_DECK, SIDE_RAIL,        -1, BRACE],
            [MAIN_DECK,  BEHIND_MAST_RAIL,  2, LIFT],
            [MAIN_DECK,  BACK_FISTS,         , SHEET],
            [FORE_DECK,  SHROUDS_RAIL,      3, BOWLINE],
            [MAIN_DECK,  SIDE_RAIL,         5, CLEWLINE],
            [MAIN_DECK,  SIDE_RAIL,         4, LEECHLINE],
            [MAIN_DECK,  SIDE_RAIL,         3, BUNTLINE],
        ]],
        [MAIN_GALLANT, [
            [STERN_DECK, SIDE_RAIL,        -2, BRACE],
            [MAIN_DECK,  BEHIND_MAST_RAIL,  1, LIFT],
            [MAIN_DECK,  SIDE_MAST_RAIL,   -2, SHEET],
            [MAIN_DECK,  SIDE_MAST_RAIL,    4, CLEWLINE],
            [MAIN_DECK,  SIDE_MAST_RAIL,    4, BUNTLINE],
        ]],
        [STAY_SAIL, [
            [MAIN_DECK,  AT_MAST_FRONT,      , HALYARD,         ,                    CENTER],
            [MAIN_DECK,  SIDE_RAIL,        -1, SHEET],
        ]],
        [, [
            [STERN_DECK, ABOVE_LADDER,       , FLAG_HALYARD,    ,                    STARBOARD],
            [FORE_DECK,  BACK_PILLARS,       , TACKLE,          'Штаговая',          PORT,      DETAIL_LINE],
            [FORE_DECK,  SHROUDS_RAIL,      1, TACKLE,          'Гротовая',          ,          DETAIL_LINE],
            [MAIN_DECK,  ON_DECK_FRONT,      , TACKLE,          'Оттяжка гротовой',  ,          'Оттяжка гротовой талёвы',    'Оттяжки гротовых талёв'],
            [MAIN_DECK,  SIDE_MAST_RAIL,   -1, TACKLE,          'Нагель для работы', ,          'Нагель для работы талёвами', 'Нагеля для работы талёвами'],
        ]],
    ]],
    [MIZZEN_MAST, [
        [MIZZEN_SAIL, [
            [STERN_DECK, AT_MAST,          -1, TOPPING_LIFT,    ,                    STARBOARD, LINE_DETAIL],
            [STERN_DECK, SHROUDS_RAIL,     -1, TACK_TACKLE,     ,                    ,          LINE_DETAIL],
            [STERN_DECK, POOP_BULWARK,      1, VANG,            ,                    ,          LINE_DETAIL],
            [STERN_DECK, POOP_BULWARK,     -1, SHEET],
            [STERN_DECK, AT_FRONT,           , TACK,            ,                    CENTER],
            [STERN_DECK, BULWARK,           3, TACK],
            [STERN_DECK, AT_MAST,           1, BUNTLINE,        ,                    PORT],
            [STERN_DECK, AT_MAST,           1, LEECHLINE,       ,                    STARBOARD],
        ]],
        [MIZZEN_TOPSAIL, [
            [MAIN_DECK,  SIDE_RAIL,         2, BRACE],
            [MAIN_DECK,  SIDE_RAIL,         1, BRACE,           CROSS_JACK,          ,          LINE_DETAIL],
            [STERN_DECK, SIDE_RAIL,         1, LIFT],
            [STERN_DECK, SIDE_RAIL,         2, LIFT,            CROSS_JACK,          ,          LINE_DETAIL],
            [STERN_DECK, SHROUDS_RAIL,     -2, SHEET],
            [MAIN_DECK,  ABOVE_RAIL,         , BOWLINE],
            [STERN_DECK, SHROUDS_RAIL,      2, CLEWLINE],
            [STERN_DECK, SHROUDS_RAIL,      2, BUNTLINE],
        ]],
        [MIZZEN_STAYSAIL, [
            [MAIN_DECK,  AT_MAST_BACK,       , TACK,            ,                    CENTER],
            [STERN_DECK, AT_MAST,          -1, HALYARD,         ,                    PORT],
            [STERN_DECK, AT_FRONT,           , SHEET,            ,                   CENTER],
            [STERN_DECK, BULWARK,           2, SHEET],
        ]],
        [, [
            [STERN_DECK, SHROUDS_RAIL,      3, FLAG_HALYARD,    ,                    PORT],
            [STERN_DECK, POOP_FLAGSTAFF,     , FLAG_HALYARD,    MIZZEN_YARD,         PORT,      LINE_DETAIL],
        ]],
    ]],
    [FLAG_STAFF, [
        [, [
            [STERN_DECK, POOP_FLAGSTAFF,     , FLAG_HALYARD,    ,                    STARBOARD],
        ]],
    ]],
    [, [
        [, [
            [FORE_DECK,  SIDE_RAIL,        -3, TACKLE,          'Якорная',           ,          DETAIL_LINE],
            [FORE_DECK,  ON_DECK_FRONT,      , MOORING_ROPE,    ,                    ,          LINE_DETAIL],
            [MAIN_DECK,  BULWARK,           2, DINGHY_BOWLINE,  ,                    ,          ,                             SINGULAR],
            [STERN_DECK, BULWARK,           2, MOORING_ROPE,    ,                    ,          LINE_DETAIL],
            [STERN_DECK, BULWARK,           3, MOORING_ROPE,    ,                    ,          LINE_DETAIL],
            [STERN_DECK, POOP_BULWARK,      2, MOORING_ROPE,    ,                    ,          LINE_DETAIL],
            [STERN_DECK, SHROUDS_RAIL,      3, FREE,            ,                    STARBOARD, DETAIL_LINE],
        ]],
    ]],
];
