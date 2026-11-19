/**
 * Google Drive Connector & Policy Sync Agent.
 * Synchronizes policy documents from Google Drive and local policy folder.
 * Detects new, updated, and deleted files and triggers re-indexing in vector store.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { parseAndChunkFile } = require('./chunker');
const vectorStore = require('./vectorStore');

class DriveConnector {
  constructor() {
    this.policiesDir = config.drivePoliciesDir;
    this.lastSync = null;
    this.fileHashes = new Map();
  }

  /**
   * Scan folder and synchronize all documents
   */
  async sync() {
    console.log(`Starting Drive synchronization from: ${this.policiesDir}`);
    if (!fs.existsSync(this.policiesDir)) {
      console.warn(`Policies directory not found: ${this.policiesDir}`);
      return { indexedDocs: 0, totalChunks: 0, status: 'dir_not_found' };
    }

    const files = fs.readdirSync(this.policiesDir);
    const validExtensions = ['.md', '.pdf', '.csv', '.txt'];
    const targetFiles = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase()));

    let totalChunksCount = 0;
    const indexedDocuments = [];

    // Clear vector store and re-index all policies fresh
    vectorStore.clearAll();

    for (const filename of targetFiles) {
      const filePath = path.join(this.policiesDir, filename);
      const stat = fs.statSync(filePath);
      
      try {
        const chunks = await parseAndChunkFile(filePath);
        if (chunks.length > 0) {
          await vectorStore.saveChunks(chunks);
          totalChunksCount += chunks.length;
          indexedDocuments.push({
            filename,
            chunks: chunks.length,
            mtime: stat.mtime
          });
        }
      } catch (err) {
        console.error(`Error parsing ${filename}:`, err.message);
      }
    }

    this.lastSync = new Date();
    console.log(`Synchronization complete: ${indexedDocuments.length} documents indexed with ${totalChunksCount} total chunks.`);

    return {
      success: true,
      syncTime: this.lastSync,
      indexedDocuments,
      totalChunks: totalChunksCount,
      policiesDir: this.policiesDir
    };
  }

  /**
   * Get sync status and document list
   */
  getStatus() {
    const stats = vectorStore.getStats();
    return {
      lastSync: this.lastSync,
      totalChunks: stats.totalChunks,
      totalDocumentos: stats.totalDocumentos,
      documentos: stats.documentos
    };
  }
}

module.exports = new DriveConnector();
