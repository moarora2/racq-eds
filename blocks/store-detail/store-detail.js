/**
 * Store Detail Block
 * Displays detailed store information rendered server-side
 */

import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Extract data from block rows
 */
function extractDataFromRows(rows) {
  const data = {
    images: [],
    texts: [],
    links: [],
    richText: [],
  };

  rows.forEach((row) => {
    const cell = row.querySelector('div');
    if (!cell) return;

    // Check for different content types
    const img = cell.querySelector('img');
    const link = cell.querySelector('a');
    const text = cell.textContent?.trim();
    const html = cell.innerHTML;

    if (img) {
      // Image element found
      data.images.push({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || 'Image',
      });
    } else if (link) {
      // Link found
      data.links.push({
        href: link.getAttribute('href'),
        text: link.textContent,
      });
    } else if (html.includes('<') && !img && !link) {
      // Rich text HTML
      data.richText.push(html);
    } else if (text) {
      // Plain text
      data.texts.push(text);
    }
  });

  return data;
}

/**
 * Build store detail content
 */
function buildStoreContent(data) {
  const container = document.createElement('div');
  container.className = 'store-detail-content';

  // Header section with hero image and title
  const header = document.createElement('div');
  header.className = 'store-header';

  // Hero image
  if (data.images.length > 0) {
    const imageData = data.images[0];
    const picture = createOptimizedPicture(
      imageData.src,
      imageData.alt,
      false, // eager loading for hero
      [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '1200' },
      ],
    );
    header.appendChild(picture);
  }

  // Title
  if (data.texts.length > 0) {
    const headerText = document.createElement('div');
    headerText.className = 'store-header-text';
    headerText.innerHTML = `<h1>${data.texts[0]}</h1>`;
    header.appendChild(headerText);
  }

  container.appendChild(header);

  // Info section
  const info = document.createElement('div');
  info.className = 'store-info';

  // Remaining text fields
  if (data.texts.length > 1) {
    const details = document.createElement('div');
    details.className = 'store-details';
    data.texts.slice(1).forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      details.appendChild(p);
    });
    info.appendChild(details);
  }

  // Rich text content (description, hours, etc.)
  data.richText.forEach((html) => {
    const div = document.createElement('div');
    div.className = 'store-description';
    div.innerHTML = html;
    info.appendChild(div);
  });

  // Additional images (gallery)
  if (data.images.length > 1) {
    const gallery = document.createElement('div');
    gallery.className = 'store-gallery';

    data.images.slice(1).forEach((imageData) => {
      const picture = createOptimizedPicture(
        imageData.src,
        imageData.alt,
        true, // lazy loading
        [{ width: '750' }],
      );
      gallery.appendChild(picture);
    });

    info.appendChild(gallery);
  }

  // Links/CTAs
  if (data.links.length > 0) {
    const linksDiv = document.createElement('div');
    linksDiv.className = 'store-links';

    data.links.forEach((link) => {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.text;
      a.className = 'button';
      linksDiv.appendChild(a);
    });

    info.appendChild(linksDiv);
  }

  container.appendChild(info);

  return container;
}

/**
 * Main decorate function
 */
export default async function decorate(block) {
  const rows = [...block.children];

  // Extract data from server-rendered rows
  const data = extractDataFromRows(rows);

  // Build content
  const content = buildStoreContent(data);

  // Replace block content
  block.innerHTML = '';
  block.appendChild(content);
}
