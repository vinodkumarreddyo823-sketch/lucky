export interface Student {
  id: string;
  name: string;
  descriptor: number[]; // Float32Array serialized as number[]
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: number;
}
