export interface SteamLibrarySnapshot {
  apps: Array<{ app_id: string; name: string }>;
  library_count: number;
  scanned_libraries: number;
  unavailable_libraries: number;
  unreadable_manifests: number;
  library_metadata_unreadable: boolean;
}
