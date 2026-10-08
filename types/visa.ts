export type CountryCode = 'au' | 'rs' | 'tr' | 'sg' | 'ru' | 'my' | 'sa' | 'bh';
export type CaseStatus = 'Idle' | 'Running' | 'OTP Required' | 'Review Required' | 'Success' | 'Error' | 'Stopped';
export interface BrowserSettings { proxyCountryCode: CountryCode; record: boolean }
export interface SlotData {
  visaType: string; applicantStatus: string; appointmentDates: string[]; biometricDates: string[];
  officialFees: { amount: number; currency: string; sourceUrl: string }[];
  sourceUrls: string[]; checkedAt: string;
}
export interface AgentOutput { checkpoint: 'otp_required' | 'review_required' | 'complete'; message: string; missingItems: string[]; data: SlotData }
export interface RunState {
  id: string; sessionId: string; status: string; after: number; hasMore: boolean;
  browserIds: string[]; liveViewUrl?: string; costUsd?: string; result?: AgentOutput; error?: string;
  events: { id: number; type: string; ts: string }[];
}
export interface DocumentReport { filename: string; text: string; names: string[]; passportNumbers: string[]; warnings: string[]; extractionMethod: string }
export interface VisaCase {
  id: string; applicantName: string; passportNumber: string; country: CountryCode; visaType: string;
  portalUrl: string; command: string; record: boolean; status: CaseStatus; run?: RunState;
  documents: DocumentReport[]; checks: Record<string, boolean>; createdAt: string;
}
export interface ConnectionInfo { keyConfigured: boolean; storageConfigured: boolean; pythonConfigured: boolean; connected: boolean; message: string }
