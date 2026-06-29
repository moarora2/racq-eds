/**
 * Store Detail Block
 * Displays detailed store information from a Content Fragment
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
    } else if (link && !text.startsWith('/content/dam/')) {
      // Link (not a CF reference)
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
 * Client-side CF fetch fallback
 */
async function fetchAndInjectCF(block, cfPath) {
  try {
    const response = await fetch(`${cfPath}.json`);
    if (!response.ok) {
      throw new Error(`CF fetch failed: ${response.status}`);
    }

    const cfData = await response.json();
    const elements = cfData.elements || {};

    // Clear block
    block.innerHTML = '';

    // Transform CF to block rows
    Object.entries(elements).forEach(([fieldName, fieldData]) => {
      const value = fieldData.value;
      if (!value) return;

      const row = document.createElement('div');
      const cell = document.createElement('div');

      // Handle images
      if (fieldData.dataType === 'image' || fieldName.toLowerCase().includes('image')) {
        const imageUrl = typeof value === 'string' ? value : (value.src || value.path);
        if (imageUrl) {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = fieldName.replace(/([A-Z])/g, ' $1').trim();
          cell.appendChild(img);
        }
      } else {
        // Plain or rich text
        cell.innerHTML = value;
      }

      row.appendChild(cell);
      block.appendChild(row);
    });

    block.setAttribute('data-cf-resolved', 'client');
  } catch (error) {
    console.error('Error fetching CF:', error);
    block.innerHTML = '<p class="error">Error loading store information</p>';
  }
}

/**
 * Main decorate function
 */
export default async function decorate(block) {
  const rows = [...block.children];

  // Check if CF was resolved by BYOM
  const cfResolved = block.getAttribute('data-cf-resolved') === 'true';
  const cfPath = block.getAttribute('data-cf-path');

  if (!cfResolved) {
    // Client-side fallback: check if first row has CF reference
    const firstCell = rows[0]?.querySelector('div');
    const cfLink = firstCell?.querySelector('a');
    const cfPathFromContent = cfLink?.getAttribute('href') || firstCell?.textContent?.trim();

    if (cfPathFromContent?.startsWith('/content/dam/')) {
      block.innerHTML = '<div class="store-loading">Loading store details...</div>';
      await fetchAndInjectCF(block, cfPathFromContent);

      // Re-extract rows after client-side fetch
      const newRows = [...block.children];
      const data = extractDataFromRows(newRows);
      const content = buildStoreContent(data);

      block.innerHTML = '';
      block.appendChild(content);
      block.setAttribute('data-store-path', cfPathFromContent);
      return;
    }

    block.innerHTML = '<p>No store information available</p>';
    return;
  }

  // BYOM resolved: extract data from rows
  const data = extractDataFromRows(rows);

  // Build content
  const content = buildStoreContent(data);

  // Replace block content
  block.innerHTML = '';
  block.appendChild(content);

  // Add metadata
  block.setAttribute('data-store-path', cfPath);
}
