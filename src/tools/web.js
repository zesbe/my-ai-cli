// Web Fetch Tool - Fetch content from URLs
import https from 'https';
import http from 'http';

export const webTool = {
  type: 'function',
  function: {
    name: 'web_fetch',
    description: 'Fetch content from a URL. Returns the text content of the webpage.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch'
        }
      },
      required: ['url']
    }
  }
};

export async function executeWebFetch({ url }) {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.get(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ZesbeCLI/1.0)'
        }
      }, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          executeWebFetch({ url: res.headers.location }).then(resolve);
          return;
        }

        if (res.statusCode !== 200) {
          resolve(`Error: HTTP ${res.statusCode}`);
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Strip HTML tags for cleaner output
          const text = data
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 10000); // Limit to 10k chars
          
          resolve(text || 'No content found');
        });
      });

      req.on('error', (e) => resolve(`Error: ${e.message}`));
      req.on('timeout', () => {
        req.destroy();
        resolve('Error: Request timeout');
      });
    } catch (e) {
      resolve(`Error: ${e.message}`);
    }
  });
}
