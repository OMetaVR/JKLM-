export const WORD_FREQUENCY = {
  'THE': 100, 'BE': 99, 'TO': 98, 'OF': 97, 'AND': 96, 'A': 95, 'IN': 94, 'THAT': 93, 'HAVE': 92, 'I': 91, 'IT': 90,
  'FOR': 89, 'NOT': 88, 'ON': 87, 'WITH': 86, 'HE': 85, 'AS': 84, 'YOU': 83, 'DO': 82, 'AT': 81, 'THIS': 80,
  'BUT': 79, 'HIS': 78, 'BY': 77, 'FROM': 76, 'THEY': 75, 'WE': 74, 'SAY': 73, 'HER': 72, 'SHE': 71, 'OR': 70,
  'AN': 69, 'WILL': 68, 'MY': 67, 'ONE': 66, 'ALL': 65, 'WOULD': 64, 'THERE': 63, 'THEIR': 62, 'WHAT': 61, 'SO': 60,
  'UP': 59, 'OUT': 58, 'IF': 57, 'ABOUT': 56, 'WHO': 55, 'GET': 54, 'WHICH': 53, 'GO': 52, 'ME': 51, 'WHEN': 50,
  'MAKE': 49, 'CAN': 48, 'LIKE': 47, 'TIME': 46, 'NO': 45, 'JUST': 44, 'HIM': 43, 'KNOW': 42, 'TAKE': 41, 'PEOPLE': 40,
  'INTO': 39, 'YEAR': 38, 'YOUR': 37, 'GOOD': 36, 'SOME': 35, 'COULD': 34, 'THEM': 33, 'SEE': 32, 'OTHER': 31, 'THAN': 30,
  'THEN': 29, 'NOW': 28, 'LOOK': 27, 'ONLY': 26, 'COME': 25, 'ITS': 24, 'OVER': 23, 'THINK': 22, 'ALSO': 21, 'BACK': 20,
  'AFTER': 19, 'USE': 18, 'TWO': 17, 'HOW': 16, 'OUR': 15, 'WORK': 14, 'FIRST': 13, 'WELL': 12, 'WAY': 11, 'EVEN': 10,
  'NEW': 9, 'WANT': 8, 'BECAUSE': 7, 'ANY': 6, 'THESE': 5, 'GIVE': 4, 'DAY': 3, 'MOST': 2, 'US': 1,
  'HOUSE': 45, 'WATER': 44, 'FOOD': 43, 'MONEY': 42, 'SCHOOL': 41, 'FAMILY': 40, 'FRIEND': 39, 'LOVE': 38, 'LIFE': 37,
  'WORLD': 36, 'PLACE': 35, 'HAND': 34, 'PART': 33, 'CHILD': 32, 'EYE': 31, 'WOMAN': 30, 'MAN': 29, 'WEEK': 28,
  'CASE': 27, 'POINT': 26, 'GOVERNMENT': 25, 'COMPANY': 24, 'NUMBER': 23, 'GROUP': 22, 'PROBLEM': 21, 'FACT': 20,
  'GAME': 35, 'PLAY': 34, 'WIN': 33, 'LOSE': 32, 'TEAM': 31, 'SCORE': 30, 'ROUND': 29, 'TURN': 28, 'WORD': 27,
  'LETTER': 26, 'SOUND': 25, 'MUSIC': 24, 'SONG': 23, 'DANCE': 22, 'PARTY': 21, 'FUN': 20, 'HAPPY': 19, 'LAUGH': 18,
  'RUN': 35, 'WALK': 34, 'TALK': 33, 'SPEAK': 32, 'LISTEN': 31, 'HEAR': 30, 'WATCH': 29, 'READ': 28, 'WRITE': 27,
  'LEARN': 26, 'TEACH': 25, 'STUDY': 24, 'HELP': 23, 'SLEEP': 20, 'EAT': 19, 'DRINK': 18,
  'CAR': 35, 'BOOK': 34, 'PHONE': 33, 'COMPUTER': 32, 'TABLE': 31, 'CHAIR': 30, 'DOOR': 29, 'WINDOW': 28, 'ROOM': 27,
  'KITCHEN': 26, 'BATHROOM': 25, 'BEDROOM': 24, 'GARDEN': 23, 'STREET': 22, 'CITY': 21, 'COUNTRY': 20, 'BUILDING': 19,
  'RED': 25, 'BLUE': 24, 'GREEN': 23, 'YELLOW': 22, 'BLACK': 21, 'WHITE': 20, 'ORANGE': 19, 'PURPLE': 18, 'PINK': 17,
  'BROWN': 16, 'GRAY': 15, 'GREY': 15,
  'THREE': 38, 'FOUR': 37, 'FIVE': 36, 'SIX': 35, 'SEVEN': 34, 'EIGHT': 33, 'NINE': 32, 'TEN': 31,
  'MONDAY': 20, 'TUESDAY': 19, 'WEDNESDAY': 18, 'THURSDAY': 17, 'FRIDAY': 16, 'SATURDAY': 15, 'SUNDAY': 14,
  'MORNING': 25, 'AFTERNOON': 24, 'EVENING': 23, 'NIGHT': 22, 'TODAY': 21, 'TOMORROW': 20, 'YESTERDAY': 19,
  'DOG': 30, 'CAT': 29, 'BIRD': 28, 'FISH': 27, 'HORSE': 26, 'COW': 25, 'PIG': 24, 'CHICKEN': 23, 'MOUSE': 22, 'LION': 21,
  'HEAD': 30, 'FACE': 29, 'NOSE': 28, 'MOUTH': 27, 'TEETH': 26, 'HAIR': 25, 'NECK': 24, 'SHOULDER': 23, 'ARM': 22,
  'FINGER': 20, 'CHEST': 19, 'LEG': 17, 'FOOT': 16, 'TOE': 15,
  'SUN': 25, 'RAIN': 24, 'SNOW': 23, 'WIND': 22, 'CLOUD': 21, 'STORM': 20, 'HOT': 19, 'COLD': 18, 'WARM': 17, 'COOL': 16
};

export const getWordFrequency = (word) => {
  return WORD_FREQUENCY[word.toUpperCase()] || 1;
};

export const isWordFrequencyEnabled = () => {
  return localStorage.getItem('jklm-mini-word-frequency-enabled') === 'true';
};

export const sortWordsByFrequency = (words) => {
  if (!isWordFrequencyEnabled()) {
    return words;
  }
  
  const wordsWithFreq = words.map(w => ({ word: w, freq: getWordFrequency(w), rand: Math.random() }));
  wordsWithFreq.sort((a, b) => {
    if (b.freq !== a.freq) return b.freq - a.freq;
    return a.rand - b.rand;
  });
  return wordsWithFreq.map(w => w.word);
};
