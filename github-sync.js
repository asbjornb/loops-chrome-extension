// GitHub Gist Sync Module
// Provides unlimited sync using GitHub Gists with version control

class GitHubSync {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.settings = null;
  }

  // Initialize with settings
  async init(settings) {
    this.settings = settings;
    return this;
  }

  // Test GitHub connection and gist permissions
  async testConnection(token) {
    try {
      // First check if token can access user info
      const userResponse = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Loops-Extension',
        },
      }).catch((error) => {
        console.error('GitHub user info fetch failed:', error.message);
        throw new Error(
          `Failed to connect to GitHub: ${error.message}. Check your internet connection.`
        );
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          throw new Error('Invalid token - please check your Personal Access Token');
        }
        throw new Error(`GitHub API error: ${userResponse.status} ${userResponse.statusText}`);
      }

      const user = await userResponse.json();

      // Test gist permissions by creating and immediately deleting a test gist
      const testGist = {
        description: 'Loops Extension - Connection Test (will be deleted)',
        public: false,
        files: {
          'test.txt': {
            content:
              'This is a test gist created by Loops extension to verify gist permissions. It will be deleted automatically.',
          },
        },
      };

      const gistResponse = await fetch(`${this.baseUrl}/gists`, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Loops-Extension',
        },
        body: JSON.stringify(testGist),
      });

      if (!gistResponse.ok) {
        if (gistResponse.status === 403) {
          throw new Error(
            'Token lacks gist permissions - please create a new token with "gist" scope enabled'
          );
        }
        throw new Error(`Gist creation failed: ${gistResponse.status} ${gistResponse.statusText}`);
      }

      const createdGist = await gistResponse.json();

      // Clean up the test gist
      try {
        await fetch(`${this.baseUrl}/gists/${createdGist.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Loops-Extension',
          },
        });
      } catch (deleteError) {
        console.warn('Failed to delete test gist:', deleteError);
        // Not critical - user can delete manually if needed
      }

      return { success: true, user };
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Create or update gist with current data
  async pushToGitHub() {
    if (!this.settings || !this.settings.githubSync.token) {
      throw new Error('GitHub not configured');
    }

    try {
      // Get current data from local storage
      const localData = await chrome.storage.local.get(['readLater', 'tasks']);

      const gistData = {
        readLater: localData.readLater || [],
        tasks: localData.tasks || [],
        lastSyncedAt: new Date().toISOString(),
        syncedFrom: 'loops-extension',
        version: chrome.runtime.getManifest().version,
        deviceId: await this.getDeviceId(),
      };

      // Security check: ensure no sensitive data is being uploaded
      this.validateGistSecurity(gistData);

      const gistContent = {
        'loops-data.json': {
          content: JSON.stringify(gistData, null, 2),
        },
        'README.md': {
          content: this.generateReadme(gistData),
        },
      };

      let response;

      if (this.settings.githubSync.gistId) {
        // Update existing gist
        response = await fetch(`${this.baseUrl}/gists/${this.settings.githubSync.gistId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `token ${this.settings.githubSync.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Loops-Extension',
          },
          body: JSON.stringify({
            description: this.settings.githubSync.description,
            files: gistContent,
          }),
        });
      } else {
        // Create new gist
        response = await fetch(`${this.baseUrl}/gists`, {
          method: 'POST',
          headers: {
            Authorization: `token ${this.settings.githubSync.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Loops-Extension',
          },
          body: JSON.stringify({
            description: this.settings.githubSync.description,
            public: this.settings.githubSync.isPublic,
            files: gistContent,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const gist = await response.json();

      // Save gist ID for future updates
      if (!this.settings.githubSync.gistId) {
        this.settings.githubSync.gistId = gist.id;
        await this.saveSettings();
      }

      // Data pushed to GitHub Gist successfully

      return {
        success: true,
        gistId: gist.id,
        url: gist.html_url,
        itemsPushed: gistData.readLater.length + gistData.tasks.length,
      };
    } catch (error) {
      console.error('GitHub push failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Pull and merge data from GitHub gist
  async pullFromGitHub() {
    if (!this.settings || !this.settings.githubSync.token || !this.settings.githubSync.gistId) {
      return { success: true, merged: false, reason: 'No gist configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/gists/${this.settings.githubSync.gistId}`, {
        headers: {
          Authorization: `token ${this.settings.githubSync.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Loops-Extension',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const gist = await response.json();
      const dataFile = gist.files['loops-data.json'];

      if (!dataFile) {
        throw new Error('Gist does not contain loops-data.json file');
      }

      const gistData = JSON.parse(dataFile.content);

      // Don't merge if data is from same device
      const currentDeviceId = await this.getDeviceId();
      if (gistData.deviceId === currentDeviceId) {
        return { success: true, merged: false, reason: 'Same device' };
      }

      // Get current local data
      const localData = await chrome.storage.local.get(['readLater', 'tasks']);

      // Merge the data (similar to Chrome sync)
      const merged = this.mergeData(localData, gistData);

      // Save merged data
      await chrome.storage.local.set(merged);

      // Data pulled from GitHub Gist and merged

      return {
        success: true,
        merged: true,
        itemsMerged: merged.readLater.length + merged.tasks.length,
        lastSynced: gistData.lastSyncedAt,
      };
    } catch (error) {
      console.error('GitHub pull failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Full sync operation
  async performSync() {
    // Starting GitHub sync

    // First pull to get any changes
    const pullResult = await this.pullFromGitHub();

    // Then push our current state
    const pushResult = await this.pushToGitHub();

    const status = {
      lastSyncTime: new Date().toISOString(),
      pullSuccess: pullResult.success,
      pushSuccess: pushResult.success,
      itemsSynced: pushResult.itemsPushed || 0,
      itemsMerged: pullResult.itemsMerged || 0,
      gistUrl: pushResult.url || null,
    };

    // Update GitHub sync status in settings
    this.settings.githubSync.lastSynced = status.lastSyncTime;
    if (pushResult.gistId) {
      this.settings.githubSync.gistId = pushResult.gistId;
    }
    await this.saveSettings();

    return status;
  }

  // Merge data from different sources
  mergeData(localData, gistData) {
    const merged = {};

    ['readLater', 'tasks'].forEach((listName) => {
      const local = localData[listName] || [];
      const remote = gistData[listName] || [];

      // Create a map of items by URL for deduplication
      const itemMap = new Map();

      // Add all items, with newer savedAt times taking precedence
      [...local, ...remote].forEach((item) => {
        const existing = itemMap.get(item.url);
        if (!existing || new Date(item.savedAt) > new Date(existing.savedAt)) {
          itemMap.set(item.url, item);
        }
      });

      // Convert back to array and sort by savedAt (newest first)
      merged[listName] = Array.from(itemMap.values()).sort(
        (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
      );
    });

    return merged;
  }

  // Generate README content for the gist
  generateReadme(data) {
    const readLaterCount = data.readLater.length;
    const tasksCount = data.tasks.length;
    const lastSynced = new Date(data.lastSyncedAt).toLocaleString();

    return `# Loops Extension - Saved Tabs

This is a backup of your saved tabs from the Loops browser extension.

## Summary
- 📚 **Read Later**: ${readLaterCount} items
- 📝 **Tasks**: ${tasksCount} items
- 🔄 **Last synced**: ${lastSynced}

## About Loops Extension

Loops helps you manage browser tabs by saving them to organized lists instead of keeping them open.

- **Save quickly**: Alt+R for Read Later, Alt+T for Tasks
- **Add context**: Notes and organization
- **Cross-device sync**: Keep your lists in sync across devices
- **Smart management**: Bulk operations, duplicate detection, suggestions

[Get Loops Extension](https://github.com/asbjornb/loops-chrome-extension)

---

*This gist is automatically managed by the Loops extension. Do not edit manually.*`;
  }

  // Security validation: ensure no sensitive data is included in gist
  validateGistSecurity(gistData) {
    const sensitiveKeys = ['token', 'password', 'key', 'secret', 'credential', 'auth'];
    const dataString = JSON.stringify(gistData).toLowerCase();

    // Check for sensitive key names
    const foundSensitive = sensitiveKeys.find((key) => dataString.includes(`"${key}"`));
    if (foundSensitive) {
      throw new Error(
        `Security violation: Attempt to upload sensitive data containing "${foundSensitive}" to GitHub gist`
      );
    }

    // Additional check for GitHub token patterns (ghp_, github_pat_)
    if (dataString.includes('ghp_') || dataString.includes('github_pat_')) {
      throw new Error('Security violation: Attempt to upload GitHub token to gist');
    }

    // Check for settings object
    if (gistData.settings || gistData.loopsSettings) {
      throw new Error('Security violation: Attempt to upload settings to GitHub gist');
    }

    // Security validation passed - no sensitive data detected
  }

  // Get or create device ID
  async getDeviceId() {
    const result = await chrome.storage.local.get(['deviceId']);
    if (result.deviceId) {
      return result.deviceId;
    }

    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await chrome.storage.local.set({ deviceId });
    return deviceId;
  }

  // Save settings
  async saveSettings() {
    if (this.settings) {
      await chrome.storage.local.set({ loopsSettings: this.settings });
    }
  }

  // Delete gist (for cleanup)
  async deleteGist(gistId) {
    if (!this.settings || !this.settings.githubSync.token) {
      throw new Error('GitHub not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/gists/${gistId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `token ${this.settings.githubSync.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Loops-Extension',
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete gist:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export for use in other scripts
const isGitHubServiceWorker = typeof window === 'undefined';
const gitHubGlobalContext = isGitHubServiceWorker ? self : window;
gitHubGlobalContext.GitHubSync = GitHubSync;

// GitHub sync module loaded
