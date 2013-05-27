var util = module.exports = {};

var zeros = '00000000'; //32 bit int

util.padHex = function (num) {
  if(num !== ~~(num)) throw new Error('must be whole number');
  var str = num.toString(16);
  return zeros.substring(str.length) + str;
};

util.unpadHex = function (numstr) {
  return parseInt(/0+([0-9a-f]+)/.exec(numstr)[1], 16);
};
