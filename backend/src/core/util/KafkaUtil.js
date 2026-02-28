/**
 * KafkaUtil - helpers for key/partition/serialization.
 */
class KafkaUtil {
  /**
   * Simple JSON serializer with fallback.
   * @param {any} value
   * @returns {string}
   */
  // eslint-disable-next-line class-methods-use-this
  serialize(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return '{}';
    }
  }

  /**
   * Round-robin partitioner placeholder.
   * Can be extended to use key-based partitioning.
   *
   * @param {string[]} partitions
   * @param {string} [key]
   * @returns {string|undefined}
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  choosePartition(partitions, key) {
    if (!Array.isArray(partitions) || partitions.length === 0) return undefined;
    const idx = Math.floor(Math.random() * partitions.length);
    return partitions[idx];
  }
}

const kafkaUtil = new KafkaUtil();
export default kafkaUtil;

