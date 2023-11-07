const markdownIt = require('markdown-it');
const markdownItAttrs = require('markdown-it-attrs');

const md = markdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

md.use(markdownItAttrs, {
  leftDelimiter: '{',
  rightDelimiter: '}',
  allowedAttributes: [],
});

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('src/static');
  eleventyConfig.addGlobalData('layout', 'base.njk');

  eleventyConfig.setLibrary('md', md);

  return {
    dir: {
      input: 'src',
    },
  };
};
