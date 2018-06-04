/* jshint strict: global */
/* jshint elision: true */
/* globals $, document, window */
"use strict";

// Full name options
var GRAMMAR = null;
var DETAIL_LINE = 'DETAIL_LINE';
var LINE_DETAIL = 'LINE_DETAIL';

// Plural name options
var SINGULAR = 'SINGULAR';
var PLURAL = 'PLURAL';

// Decks
var FORE_DECK = 'Бак';
var MAIN_DECK = 'Главная';
var STERN_DECK = 'ПолуЮт';

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
var DINGHY_BOWLINE = 'Носовой шлюпки';

var MOORING_BOW = 'Носовой швартов';
var MOORING_STERN = 'Кормовой швартов';
var MOORING_TAFF = 'Гакабортный швартов';

// Details
var COIL = 'Бухта';
var MIZZEN_YARD = 'Рю';
var CROSS_JACK = 'Бегин-рей';

// Sides
var PORT = 'port';
var STARBOARD = 'starboard';
var CENTER = 'center';

var FREE = 'свободный нагель';

// Decks
var DECKS = [
  // Name        ID      Title
    [FORE_DECK, 'fore', 'На баке'],
    [MAIN_DECK, 'main', 'На главной палубе'],
    [STERN_DECK, 'stern', 'На полуюте'],
];

// Rail locations
var RAILS = {
         frontRail: 'на планке спереди',
          backRail: 'на планке сзади',
          sideRail: 'на планке у борта',
       shroudsRail: 'на планке на вантах',
      sideMastRail: 'сбоку от мачты, на планке',
    behindMastRail: 'позади мачты, на планке',
        frontFists: 'перед мачтой, на кулаках',
         backFists: 'позади мачты, на кулаках',
      frontPillars: 'перед мачтой, на пиллерсах',
       backPillars: 'позади мачты, на пиллерсах',
            atMast: 'на мачте',
       atMastFront: 'на мачте спереди',
        atMastSide: 'на мачте сбоку',
        atMastBack: 'на мачте сзади',
           atFront: 'спереди',
       behindFront: 'за планкой спереди',
           bulwark: 'на фальшборту',
         aboveRail: 'над планкой у борта',
       onDeckFront: 'перед мачтой, на палубе',
       aboveLadder: 'над трапом',
       poopBulwark: 'на юте, на фальшборту',
     poopFlagstaff: 'на юте, на флагштоке',
};

var LINES = [
  // Mast ID/Sail/Deck   Rail         Point#  Line             Detail               Assym      Full Name                     Plural
    [BOWSPRIT,, [
        [SPRIT_SAIL, [
            [FORE_DECK,  'frontRail',      4, BRACE],
            [FORE_DECK,  'frontRail',      3, LIFT],
            [FORE_DECK,  'sideRail',      -1, SHEET],
            [FORE_DECK,  'behindFront',     , CLEWLINE],
            [FORE_DECK,  'behindFront',     , BUNTLINE],
        ]],
    ]],
    [FORE_MAST, 'fore', [
        [FORE_SAIL, [
            [FORE_DECK,  'backRail',       1, BRACE],
            [FORE_DECK,  'behindMastRail', 3, LIFT],
            [MAIN_DECK,  'bulwark',        1, SHEET],
            [FORE_DECK,  'frontRail',     -1, TACK],
            [FORE_DECK,  'frontRail',      2, BOWLINE],
            [FORE_DECK,  'atMastFront',     , DOWNHAULER,      ,                    CENTER,    ,                             PLURAL],
            [FORE_DECK,  'sideRail',      -2, CLEWLINE],
            [FORE_DECK,  'sideRail',       2, LEECHLINE],
            [FORE_DECK,  'sideRail',       1, BUNTLINE],
        ]],
        [FORE_TOPSAIL, [
            [FORE_DECK,  'backRail',       2, BRACE],
            [FORE_DECK,  'behindMastRail', 2, LIFT],
            [FORE_DECK,  'frontFists',      , SHEET],
            [FORE_DECK,  'atMastSide',      , SHEET,           COIL],
            [FORE_DECK,  'frontRail',      1, BOWLINE],
            [FORE_DECK,  'sideRail',       5, CLEWLINE],
            [FORE_DECK,  'sideRail',       4, LEECHLINE],
            [FORE_DECK,  'sideRail',       3, BUNTLINE],
        ]],
        [FORE_GALLANT, [
            [FORE_DECK,  'backRail',       3, BRACE],
            [FORE_DECK,  'behindMastRail', 1, LIFT],
            [FORE_DECK,  'shroudsRail',   -1, SHEET],
            [FORE_DECK,  'shroudsRail',   -2, CLEWLINE],
            [FORE_DECK,  'shroudsRail',   -2, BUNTLINE],
        ]],
        [, [
            [FORE_DECK,  'backPillars',     , FLAG_HALYARD,    ,                    STARBOARD, ,                             PLURAL],
        ]],
    ]],
    [MAIN_MAST, 'main', [
        [MAIN_SAIL, [
            [STERN_DECK, 'bulwark',        1, BRACE],
            [STERN_DECK, 'shroudsRail',    1, BRACE,           COIL],
            [MAIN_DECK,  'behindMastRail', 3, LIFT],
            [STERN_DECK, 'bulwark',       -1, SHEET],
            [MAIN_DECK,  'bulwark',       -1, TACK],
            [FORE_DECK,  'shroudsRail',    2, BOWLINE],
            [MAIN_DECK,  'frontPillars',    , DOWNHAULER,      ,                    ,         ,                              PLURAL],
            [MAIN_DECK,  'sideMastRail',   3, CLEWLINE],
            [MAIN_DECK,  'sideMastRail',   2, LEECHLINE],
            [MAIN_DECK,  'sideMastRail',   1, BUNTLINE],
        ]],
        [MAIN_TOPSAIL, [
            [STERN_DECK, 'sideRail',      -1, BRACE],
            [MAIN_DECK,  'behindMastRail', 2, LIFT],
            [MAIN_DECK,  'backFists',       , SHEET],
            [FORE_DECK,  'shroudsRail',    3, BOWLINE],
            [MAIN_DECK,  'sideRail',       5, CLEWLINE],
            [MAIN_DECK,  'sideRail',       4, LEECHLINE],
            [MAIN_DECK,  'sideRail',       3, BUNTLINE],
        ]],
        [MAIN_GALLANT, [
            [STERN_DECK, 'sideRail',      -2, BRACE],
            [MAIN_DECK,  'behindMastRail', 1, LIFT],
            [MAIN_DECK,  'sideMastRail',  -2, SHEET],
            [MAIN_DECK,  'sideMastRail',   4, CLEWLINE],
            [MAIN_DECK,  'sideMastRail',   4, BUNTLINE],
        ]],
        [STAY_SAIL, [
            [MAIN_DECK,  'atMastFront',     , HALYARD,         ,                    CENTER],
            [MAIN_DECK,  'sideRail',      -1, SHEET],
        ]],
        [, [
            [STERN_DECK, 'aboveLadder',     , FLAG_HALYARD,    ,                    STARBOARD],
            [FORE_DECK,  'backPillars',     , TACKLE,          'Штаговая',          PORT,      DETAIL_LINE],
            [FORE_DECK,  'shroudsRail',    1, TACKLE,          'Гротовая',          ,          DETAIL_LINE],
            [MAIN_DECK,  'onDeckFront',     , TACKLE,          'Оттяжка гротовой',  ,          'Оттяжка гротовой талёвы',    'Оттяжки гротовых талёв'],
            [MAIN_DECK,  'sideMastRail',  -1, TACKLE,          'Нагель для работы', ,          'Нагель для работы талёвами', 'Нагеля для работы талёвами'],
        ]],
    ]],
    [MIZZEN_MAST, 'mizzen', [
        [MIZZEN_SAIL, [
            [STERN_DECK, 'atMast',        -1, TOPPING_LIFT,    ,                    STARBOARD, LINE_DETAIL],
            [STERN_DECK, 'shroudsRail',   -1, TACK_TACKLE,     ,                    ,          LINE_DETAIL],
            [STERN_DECK, 'poopBulwark',    1, VANG,            ,                    ,          LINE_DETAIL],
            [STERN_DECK, 'poopBulwark',   -1, SHEET],
            [STERN_DECK, 'atFront',         , TACK,            ,                    CENTER],
            [STERN_DECK, 'bulwark',        3, TACK],
            [STERN_DECK, 'atMast',         1, BUNTLINE,        ,                    PORT],
            [STERN_DECK, 'atMast',         1, LEECHLINE,       ,                    STARBOARD],
        ]],
        [MIZZEN_TOPSAIL, [
            [MAIN_DECK,  'sideRail',       2, BRACE],
            [MAIN_DECK,  'sideRail',       1, BRACE,           CROSS_JACK,          ,          LINE_DETAIL],
            [STERN_DECK, 'sideRail',       1, LIFT],
            [STERN_DECK, 'sideRail',       2, LIFT,            CROSS_JACK,          ,          LINE_DETAIL],
            [STERN_DECK, 'shroudsRail',   -2, SHEET],
            [MAIN_DECK,  'aboveRail',       , BOWLINE],
            [STERN_DECK, 'shroudsRail',    2, CLEWLINE],
            [STERN_DECK, 'shroudsRail',    2, BUNTLINE],
        ]],
        [MIZZEN_STAYSAIL, [
            [MAIN_DECK,  'atMastBack',      , TACK,            ,                    CENTER],
            [STERN_DECK, 'atMast',        -1, HALYARD,         ,                    PORT],
            [STERN_DECK, 'atFront',         , SHEET,            ,                   CENTER],
            [STERN_DECK, 'bulwark',        2, SHEET],
        ]],
        [, [
            [STERN_DECK, 'shroudsRail',    3, FLAG_HALYARD,    ,                    PORT],
            [STERN_DECK, 'poopFlagstaff',   , FLAG_HALYARD,    MIZZEN_YARD,         PORT,      LINE_DETAIL],
        ]],
    ]],
    [FLAG_STAFF,, [
        [, [
            [STERN_DECK, 'poopFlagstaff',   , FLAG_HALYARD,    ,                    STARBOARD],
        ]],
    ]],
    [,, [
        [, [
            [FORE_DECK,  'sideRail',      -3, TACKLE,          'Якорная',           ,          DETAIL_LINE],
            [FORE_DECK,  'onDeckFront',     , MOORING_BOW ,    ,                    ,          LINE_DETAIL],
            [MAIN_DECK,  'bulwark',        2, DINGHY_BOWLINE,  ,                    ,          ,                             SINGULAR],
            [STERN_DECK, 'bulwark',        2, MOORING_STERN,   ,                    ,          LINE_DETAIL],
            [STERN_DECK, 'bulwark',        3, MOORING_STERN,   ,                    ,          LINE_DETAIL],
            [STERN_DECK, 'poopBulwark',    2, MOORING_TAFF,    ,                    ,          LINE_DETAIL],
            [STERN_DECK, 'shroudsRail',    3, FREE,            ,                    STARBOARD, DETAIL_LINE],
        ]],
    ]],
];
