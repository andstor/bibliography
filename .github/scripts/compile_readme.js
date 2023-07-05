const core = require('@actions/core');
const axios = require('axios');
const fs = require('fs');

async function parseTableOfContents(url) {
  const response = await axios.get(url);
  const lines = response.data.split('\n');
  const tocStartRegex = /^## Table of Contents$/;
  const linkRegex = /^\s+\*\s+\[([^\]]+)\]\(([^)]+)\)(.*)$/;
  const toc = [];

  let tocStarted = false;
  for (const line of lines) {
    if (!tocStarted) {
      if (tocStartRegex.test(line)) {
        tocStarted = true;
      }
    } else {
      const linkMatch = line.match(linkRegex);
      if (linkMatch) {
        const title = linkMatch[1];
        const link = linkMatch[2];
        toc.push({ title, link });
      }
    }
  }

  return toc;
}

async function isMarkdownFile(url) {
  try {
    const response = await axios.head(url);
    const contentType = response.headers['content-type'];
    return contentType.startsWith('text/plain');
  } catch (error) {
    return false;
  }
}

async function processLinks(baseURL, links, visited, output) {
  for (const link of links) {
    if (!visited.has(link.link)) {
      visited.add(link.link);
      const url = baseURL + link.link + '.md';
      console.log(`Processing ${url}`);
      const isMarkdown = await isMarkdownFile(url);
      if (isMarkdown) {
        const response = await axios.get(url);
        const content = response.data;

        // Remove relative links to the same file
        const cleanedContent = content.replace(/\[([^\]]+)\]\(#\)/g, '');

        output.push(cleanedContent);

        const nestedLinks = await parseTableOfContents(url);
        await processLinks(baseURL, nestedLinks, visited, output);
      } else {
        console.log(`Skipping ${url} - Not a markdown file`);
      }
    }
  }
}

async function run() {
  try {
    const baseURL = 'https://github.com/andstor/bibliography/wiki/';
    const tocURL = baseURL + 'Home.md';
    const toc = await parseTableOfContents(tocURL);

    const visited = new Set();
    const output = [];

    await processLinks(baseURL, toc, visited, output);

    // Combine all contents into a single README file
    const readmeContent = tocURL + '\n\n' + output.join('\n\n');

    // Write the README file
    fs.writeFileSync('README.md', readmeContent);

    console.log('README file created successfully!');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
