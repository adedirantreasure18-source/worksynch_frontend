

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

export interface GoogleDriveUser {
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleDriveBackupMetadata {
  id: string;
  name: string;
  timestamp: string;
  sizeBytes: number;
  jobsCount: number;
  workersCount: number;
  vehiclesCount: number;
  version: string;
  webViewLink?: string;
}

const DRIVE_TOKEN_KEY = 'worksynch_gdrive_token';
const DRIVE_USER_KEY = 'worksynch_gdrive_user';
const DRIVE_CLIENT_ID_KEY = 'worksynch_gdrive_client_id';
const DRIVE_FOLDER_ID_KEY = 'worksynch_gdrive_folder_id';
const DRIVE_AUTO_BACKUP_KEY = 'worksynch_gdrive_auto_backup';
const DRIVE_LAST_BACKUP_KEY = 'worksynch_gdrive_last_backup';

const DEFAULT_CLIENT_ID = '172728343478-demo.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';

class GoogleDriveService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenClient: any = null;

  constructor() {
    this.loadPersistedToken();
  }

  private loadPersistedToken() {
    try {
      const storedToken = localStorage.getItem(DRIVE_TOKEN_KEY);
      if (storedToken) {
        const parsed = JSON.parse(storedToken);
        if (parsed.token && parsed.expiresAt > Date.now()) {
          this.accessToken = parsed.token;
          this.tokenExpiresAt = parsed.expiresAt;
        } else {

          this.clearStoredToken();
        }
      }
    } catch (e) {
      console.warn('Could not parse stored Google Drive token');
    }
  }

  public getClientId(): string {
    const envId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    const storedId = localStorage.getItem(DRIVE_CLIENT_ID_KEY);
    return (storedId && storedId.trim()) || (envId && envId.trim()) || DEFAULT_CLIENT_ID;
  }

  public isCustomClientIdConfigured(): boolean {
    const id = this.getClientId();
    return Boolean(id && !id.includes('-demo.') && id.includes('.apps.googleusercontent.com'));
  }

  public setClientId(clientId: string) {
    if (clientId && clientId.trim()) {
      localStorage.setItem(DRIVE_CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(DRIVE_CLIENT_ID_KEY);
    }
  }

  public getStoredUser(): GoogleDriveUser | null {
    try {
      const stored = localStorage.getItem(DRIVE_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  public isConnected(): boolean {
    return Boolean(this.accessToken && this.tokenExpiresAt > Date.now());
  }

  public getAutoBackupEnabled(): boolean {
    return localStorage.getItem(DRIVE_AUTO_BACKUP_KEY) === 'true';
  }

  public setAutoBackupEnabled(enabled: boolean) {
    localStorage.setItem(DRIVE_AUTO_BACKUP_KEY, enabled ? 'true' : 'false');
  }

  public getLastBackupTime(): string | null {
    return localStorage.getItem(DRIVE_LAST_BACKUP_KEY);
  }

  public setLastBackupTime(isoString: string) {
    localStorage.setItem(DRIVE_LAST_BACKUP_KEY, isoString);
  }

  private clearStoredToken() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    localStorage.removeItem(DRIVE_TOKEN_KEY);
    localStorage.removeItem(DRIVE_USER_KEY);
    localStorage.removeItem(DRIVE_FOLDER_ID_KEY);
  }

  public signOut() {
    if (this.accessToken && typeof (window as any).google?.accounts?.oauth2?.revoke === 'function') {
      try {
        (window as any).google.accounts.oauth2.revoke(this.accessToken, () => {});
      } catch (e) {}
    }
    this.clearStoredToken();
  }

  public async authorize(): Promise<{ success: boolean; user?: GoogleDriveUser; error?: string }> {
    return new Promise((resolve) => {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {

        setTimeout(() => {
          const retryGoogle = (window as any).google;
          if (!retryGoogle?.accounts?.oauth2) {
            resolve({
              success: false,
              error: 'Google Identity Services library is still loading. Please check your internet connection and try again.',
            });
            return;
          }
          this.initiateOAuth(retryGoogle, resolve);
        }, 800);
        return;
      }
      this.initiateOAuth(google, resolve);
    });
  }

  private initiateOAuth(google: any, resolve: (res: any) => void) {
    const clientId = this.getClientId();

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp.error) {
            console.error('Google OAuth error:', resp);
            let errMsg = resp.error_description || resp.error || 'Google Drive authorization failed.';
            if (!this.isCustomClientIdConfigured()) {
              errMsg = `Google OAuth setup required: Please enter your Google Cloud OAuth Web Client ID under "Google Cloud OAuth 2.0 Client ID Settings" below, then click Connect again. (Error: ${resp.error})`;
            }
            resolve({
              success: false,
              error: errMsg,
            });
            return;
          }

          if (resp.access_token) {
            this.accessToken = resp.access_token;
            const expiresInSec = Number(resp.expires_in) || 3599;
            this.tokenExpiresAt = Date.now() + expiresInSec * 1000;

            localStorage.setItem(
              DRIVE_TOKEN_KEY,
              JSON.stringify({
                token: this.accessToken,
                expiresAt: this.tokenExpiresAt,
              })
            );

            const user = await this.fetchUserProfile(this.accessToken);
            if (user) {
              localStorage.setItem(DRIVE_USER_KEY, JSON.stringify(user));
            }

            try {
              await this.getOrCreateAppFolder();
            } catch (folderErr) {
              console.warn('Folder creation delayed:', folderErr);
            }

            resolve({ success: true, user: user || { email: 'Connected Google User', name: 'FieldOps Administrator' } });
          }
        },
      });

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      resolve({
        success: false,
        error: err.message || 'Failed to initialize Google OAuth Token Client.',
      });
    }
  }

  private async fetchUserProfile(token: string): Promise<GoogleDriveUser | null> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          email: data.email || '',
          name: data.name || data.email || 'Google User',
          picture: data.picture,
        };
      }
    } catch (e) {
      console.warn('Could not fetch Google user profile:', e);
    }
    return null;
  }

  public async getOrCreateAppFolder(): Promise<string> {
    const cachedId = localStorage.getItem(DRIVE_FOLDER_ID_KEY);
    if (cachedId) return cachedId;

    const token = this.getValidToken();
    if (!token) throw new Error('Not connected to Google Drive');

    const folderName = 'Worksynch FieldOps Storage';

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
      folderName
    )}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const folderId = data.files[0].id;
        localStorage.setItem(DRIVE_FOLDER_ID_KEY, folderId);
        return folderId;
      }
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Worksynch Field Service Management Cloud Backups and File Storage',
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create Google Drive folder (${createRes.status})`);
    }

    const createdData = await createRes.json();
    localStorage.setItem(DRIVE_FOLDER_ID_KEY, createdData.id);
    return createdData.id;
  }

  private getValidToken(): string | null {
    if (this.accessToken && this.tokenExpiresAt > Date.now()) {
      return this.accessToken;
    }
    this.loadPersistedToken();
    return this.accessToken && this.tokenExpiresAt > Date.now() ? this.accessToken : null;
  }

  public async uploadBackup(data: any, customName?: string): Promise<{ success: boolean; file?: GoogleDriveFile; error?: string }> {
    const token = this.getValidToken();
    if (!token) {
      return { success: false, error: 'Google Drive is not connected. Please connect your Google account in Settings.' };
    }

    try {
      const folderId = await this.getOrCreateAppFolder();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = customName || `worksynch_backup_${timestamp}.json`;

      const payload = {
        app: 'worksynch',
        version: '2.5.0',
        createdAt: new Date().toISOString(),
        data,
      };

      const fileContent = JSON.stringify(payload, null, 2);
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId],
        description: `Worksynch Cloud Backup: ${data.jobs?.length || 0} jobs, ${data.workers?.length || 0} workers, ${data.vehicles?.length || 0} fleet vehicles.`,
        properties: {
          app: 'worksynch',
          type: 'full_backup',
          jobsCount: String(data.jobs?.length || 0),
          workersCount: String(data.workers?.length || 0),
          vehiclesCount: String(data.vehicles?.length || 0),
          timestamp: new Date().toISOString(),
        },
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Drive upload failed with status ${uploadRes.status}`);
      }

      const file = await uploadRes.json();
      this.setLastBackupTime(new Date().toISOString());

      return { success: true, file };
    } catch (err: any) {
      console.error('Google Drive backup error:', err);
      return { success: false, error: err.message || 'Failed to upload backup to Google Drive.' };
    }
  }

  public async listBackups(): Promise<GoogleDriveBackupMetadata[]> {
    const token = this.getValidToken();
    if (!token) return [];

    try {
      const folderId = await this.getOrCreateAppFolder();
      const query = `'${folderId}' in parents and trashed=false and mimeType='application/json'`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,size,createdTime,modifiedTime,webViewLink,properties)&orderBy=createdTime desc&pageSize=50`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn('Failed to list drive files:', res.status);
        return [];
      }

      const data = await res.json();
      if (!data.files) return [];

      return data.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        timestamp: f.createdTime || f.modifiedTime || new Date().toISOString(),
        sizeBytes: Number(f.size) || 0,
        jobsCount: Number(f.properties?.jobsCount || 0),
        workersCount: Number(f.properties?.workersCount || 0),
        vehiclesCount: Number(f.properties?.vehiclesCount || 0),
        version: f.properties?.version || '2.5.0',
        webViewLink: f.webViewLink,
      }));
    } catch (e) {
      console.error('Error listing Drive backups:', e);
      return [];
    }
  }

  public async downloadBackupData(fileId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = this.getValidToken();
    if (!token) {
      return { success: false, error: 'Google Drive is not connected.' };
    }

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to download backup (${res.status})`);
      }

      const json = await res.json();
      const appData = json.data || json;

      if (!appData.jobs && !appData.workers) {
        throw new Error('Downloaded file does not contain valid Worksynch state structure.');
      }

      return { success: true, data: appData };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to download and parse backup from Google Drive.' };
    }
  }

  public async deleteFile(fileId: string): Promise<boolean> {
    const token = this.getValidToken();
    if (!token) return false;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async uploadAttachment(
    file: Blob | File,
    fileName: string,
    mimeType: string,
    description?: string
  ): Promise<{ success: boolean; file?: GoogleDriveFile; error?: string }> {
    const token = this.getValidToken();
    if (!token) {
      return { success: false, error: 'Google Drive is not connected.' };
    }

    try {
      const folderId = await this.getOrCreateAppFolder();
      const metadata = {
        name: fileName,
        mimeType: mimeType || 'application/octet-stream',
        parents: [folderId],
        description: description || 'Worksynch FieldOps Attachment',
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,thumbnailLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Failed to upload attachment (${res.status})`);
      }

      const uploaded = await res.json();
      return { success: true, file: uploaded };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to upload attachment to Google Drive.' };
    }
  }

  public async exportJobsToGoogleSheet(jobs: any[]): Promise<{ success: boolean; webViewLink?: string; error?: string }> {
    const token = this.getValidToken();
    if (!token) {
      return { success: false, error: 'Google Drive is not connected.' };
    }

    try {
      const folderId = await this.getOrCreateAppFolder();
      const title = `Worksynch_Jobs_Report_${new Date().toISOString().split('T')[0]}`;

      const headers = ['Job ID', 'Title', 'Client', 'Status', 'Priority', 'Assigned Engineer', 'Assigned Driver', 'Scheduled Date', 'Time Window', 'Address', 'Zone', 'Price'];
      const rows = jobs.map((j) => [
        `"${j.id || ''}"`,
        `"${(j.title || '').replace(/"/g, '""')}"`,
        `"${(j.client || '').replace(/"/g, '""')}"`,
        `"${j.status || ''}"`,
        `"${j.priority || ''}"`,
        `"${(j.assignedWorkerName || j.assignedWorkerId || '').replace(/"/g, '""')}"`,
        `"${(j.assignedDriverName || j.assignedDriverId || '').replace(/"/g, '""')}"`,
        `"${j.date || ''}"`,
        `"${j.timeWindow || ''}"`,
        `"${(j.address || '').replace(/"/g, '""')}"`,
        `"${j.zone || ''}"`,
        `"${j.price || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      const metadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet', 
        parents: [folderId],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/csv\r\n\r\n' +
        csvContent +
        closeDelimiter;

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!res.ok) {
        throw new Error(`Google Sheets export failed with status ${res.status}`);
      }

      const result = await res.json();
      return { success: true, webViewLink: result.webViewLink };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to export jobs to Google Sheets.' };
    }
  }
}

export const googleDriveService = new GoogleDriveService();
