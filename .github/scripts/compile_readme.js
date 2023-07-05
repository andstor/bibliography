const axios = require('axios');
const fs = require('fs');

async function getContents(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return '';
  }
}

async function parseTableOfContents(contents) {
  const regex = /^(\s*)\* \[(.*?)\]\((.*?)\)/gm;
  const toc = [];
  let match;

  while ((match = regex.exec(contents))) {
    const indent = match[1].length;
    const title = match[2];
    const link = match[3];

    toc.push({ indent, title, link });
  }

  return toc;
}

async function processLinks(toc) {
  let readmeContents = '## Table of Contents\n\n';
  let tocContents = '';

  for (const { indent, title, link } of toc) {
    const tocEntry = `${' '.repeat(indent)}* [${title}](${link})\n`;

    tocContents += tocEntry;

    if (!link.startsWith('http')) {
      const fileContents = await getContents(link);
      readmeContents += `\n# ${title}\n\n${fileContents.trim()}\n\n---\n`;
    }
  }

  return tocContents + '\n' + readmeContents;
}

async function run() {
  const homePageURL = 'https://github.com/andstor/bibliography/wiki/Home.md';
  const homePageContents = await getContents(homePageURL);
  const toc = await parseTableOfContents(homePageContents);
  const finalContents = await processLinks(toc);

  fs.writeFileSync('README.md', finalContents);
}

run().catch(console.error);
