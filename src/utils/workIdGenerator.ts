/**
 * Work ID Generation Utilities
 * Generates unique 8-digit numeric IDs for work information entries
 */

/**
 * Work ID Generator class for creating unique 8-digit numeric IDs
 */
export class WorkIdGenerator {
  private static usedIds: Set<string> = new Set();

  /**
   * Generates a unique 8-digit numeric work ID
   * @returns A unique 8-digit numeric string (10000000-99999999)
   */
  static generateUniqueId(): string {
    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
      // Generate random 8-digit number (10000000 to 99999999)
      const min = 10000000;
      const max = 99999999;
      const id = Math.floor(Math.random() * (max - min + 1) + min).toString();

      // Check if ID is already used
      if (!this.usedIds.has(id)) {
        this.usedIds.add(id);
        return id;
      }

      attempts++;
    }

    throw new Error(`Could not generate unique work ID after ${maxAttempts} attempts`);
  }

  /**
   * Validates that a work ID is in the correct 8-digit numeric format
   * @param id The work ID to validate
   * @returns true if the ID is valid, false otherwise
   */
  static isValidWorkId(id: string): boolean {
    // Check if it's exactly 8 digits
    if (!/^\d{8}$/.test(id)) {
      return false;
    }

    // Check if it's in the valid range (10000000-99999999)
    const numId = parseInt(id, 10);
    return numId >= 10000000 && numId <= 99999999;
  }

  /**
   * Resets the used IDs set (primarily for testing purposes)
   */
  static resetUsedIds(): void {
    this.usedIds.clear();
  }

  /**
   * Gets the count of currently used IDs
   * @returns Number of IDs currently in use
   */
  static getUsedIdCount(): number {
    return this.usedIds.size;
  }

  /**
   * Checks if a specific ID is already used
   * @param id The ID to check
   * @returns true if the ID is already used, false otherwise
   */
  static isIdUsed(id: string): boolean {
    return this.usedIds.has(id);
  }

  /**
   * Manually marks an ID as used (useful for initialization from persistent storage)
   * @param id The ID to mark as used
   */
  static markIdAsUsed(id: string): void {
    if (this.isValidWorkId(id)) {
      this.usedIds.add(id);
    } else {
      throw new Error(`Invalid work ID format: ${id}`);
    }
  }
}