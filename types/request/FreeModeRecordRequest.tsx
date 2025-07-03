export interface FreeModeRecordStoreRequest {
    userId: number;
    date: string; // '2025-06-29 19:32'
    distance: number; 
    path: { latitude: number; longitude: number }[];
}