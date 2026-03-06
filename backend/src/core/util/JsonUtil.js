/**
 * JsonUtil - consistent JSON serialization/deserialization with safe parsing.
 */
class JsonUtil {
  /**
   * @param {any} value
   * @returns {string}
   */
  stringify(value) {
    try {
      return JSON.stringify(value);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[JsonUtil] stringify error:', err);
      return '{}';
    }
  }

  /**
   * @param {string} text
   * @param {any} [fallback=null]
   * @returns {any}
   */
  parse(text, fallback = null) {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }
}

const jsonUtil = new JsonUtil();
export default jsonUtil;

*** End Patch```}"}]}}} -->
```diff
