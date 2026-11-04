// yuzh-common/image.js : 画像の URL を、Cosense が画像として表示できる形にする
//   Cosense は URL の末尾が .png .jpg .jpeg .gif .svg のときだけ画像として表示する
//   それ以外の形式（webp・avif・bmp など）や、末尾に ?… が付いた URL は、
//   最後に「#.拡張子」を付けると画像として表示される（# 以降はブラウザがサーバーに送らない）

// Cosense がそのまま画像と認める拡張子
const COSENSE_IMAGE = /\.(png|jpe?g|gif|svg)$/i;
// ブラウザが表示できる画像の拡張子（Cosense が画像と認めないものも含む）
export const IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|apng)$/i;

// URL のパス部分（? と # を除いたもの）
const pathOf = url => url.replace(/[?#].*$/, '');

export const isImageUrl = url => IMAGE_EXT.test(pathOf(url));

// [ ] で囲んだときに画像として表示される URL にする
export const imageLink = url => {
  if (COSENSE_IMAGE.test(url)) return url;            // そのままで表示される
  const ext = (pathOf(url).match(IMAGE_EXT) || [])[1];
  if (ext && COSENSE_IMAGE.test('.' + ext)) return `${url.replace(/#.*$/, '')}#.${ext.toLowerCase()}`; // ?… 付きの png など
  return `${url.replace(/#.*$/, '')}#.png`;            // webp・avif など、Cosense が画像と認めない形式
};
