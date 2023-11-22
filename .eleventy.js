const postcss = require('postcss');
const markdownIt = require('markdown-it');
const markdownItAttrs = require('markdown-it-attrs');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');

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

module.exports = function (config) {
  config.addPlugin(syntaxHighlight);
  config.addTemplateFormats('css');
  config.addGlobalData('layout', 'base.njk');
  config.setLibrary('md', md);

  config.addExtension('css', {
    getData() {
      return { layout: false };
    },
    outputFileExtension: 'css',
    compile: async (content, path) => {
      const output = await postcss([require('postcss-preset-env')]).process(
        content,
        { from: path }
      );

      return () => output.css;
    },
  });

  config.addPassthroughCopy('src/static', {
    filter: ['*', '*/*.*', '!*.css'],
  });

  return {
    dir: {
      input: 'src',
    },
  };
};
