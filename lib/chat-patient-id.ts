/** Browser key for default chat / dashboard patient context. */
export const CHAT_PATIENT_STORAGE_KEY = "sugarfree_chat_patient_id";
const LEGACY_CHAT_PATIENT_KEY = "ayuq_chat_patient_id";

export function getStoredChatPatientId(): string {
  if (typeof window === "undefined") return "P001";
  return (
    localStorage.getItem(CHAT_PATIENT_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_CHAT_PATIENT_KEY) ??
    "P001"
  );
}

export function setStoredChatPatientId(patientId: string): void {
  localStorage.setItem(CHAT_PATIENT_STORAGE_KEY, patientId);
  try {
    localStorage.removeItem(LEGACY_CHAT_PATIENT_KEY);
  } catch {
    /* ignore */
  }
}
