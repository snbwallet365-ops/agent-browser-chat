export type Country = 'au' | 'rs' | 'tr' | 'sg' | 'ru' | 'my' | 'sa' | 'bh';
export type Language = 'en' | 'bn';
export type Status = 'Idle' | 'Running' | 'OTP Required' | 'Review Required' | 'Success' | 'Error' | 'Dispatch Unknown';
export interface SlotData { visaType: string; applicantStatus: string; appointmentDates: string[]; biometricDates: string[]; officialFees: {amount:number; currency:string; sourceUrl:string}[]; sourceUrls:string[]; checkedAt:string }
export interface AgentResult { checkpoint:'otp_required'|'review_required'|'complete'; message:string; data:SlotData }
export interface RunState { id:string; sessionId:string; status:string; after:number; hasMore:boolean; browserIds:string[]; liveViewUrl?:string; result?:AgentResult; costUsd?:string; browserStopped?:boolean }
export interface DocumentEvidence { filename:string; text:string; names:string[]; passportNumbers:string[]; expiryDates:string[]; warnings:string[] }
export interface VisaCase { id:string; applicantName:string; country:Country; visaType:string; portalUrl:string; command:string; status:Status; createdAt:string; updatedAt:string; documents:DocumentEvidence[]; checklist:Record<string,boolean>; run?:RunState; error?:string }
