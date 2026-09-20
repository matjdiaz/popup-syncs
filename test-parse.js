const content = `window.__welcomeConfig = {
  "clientId": "test.com",
  "messages": [
    {
      "id": 169000000,
      "title": "Welcome"
    }
  ]
};`;

function parseImportedConfig(content) {
    if (!content) return null;
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        try {
            const jsonStr = content.substring(startIndex, endIndex + 1);
            return JSON.parse(jsonStr);
        } catch (err) {
            console.error(err);
        }
    }
    return null;
}

console.log(parseImportedConfig(content));
