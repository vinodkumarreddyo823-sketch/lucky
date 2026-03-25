import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Users, ClipboardList, UserPlus, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Student, AttendanceRecord } from './types';

// Model URL
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'records'>('attendance');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelsLoaded(true);
        console.log('Models loaded successfully');
      } catch (err) {
        console.error('Error loading models:', err);
        setStatus({ type: 'error', message: 'Failed to load face recognition models. Please check your internet connection.' });
      }
    };
    loadModels();

    // Load data from localStorage
    const savedStudents = localStorage.getItem('students');
    if (savedStudents) setStudents(JSON.parse(savedStudents));

    const savedAttendance = localStorage.getItem('attendance');
    if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
  }, []);

  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('attendance', JSON.stringify(attendance));
  }, [attendance]);

  const addStudent = (name: string, descriptor: Float32Array) => {
    const newStudent: Student = {
      id: crypto.randomUUID(),
      name,
      descriptor: Array.from(descriptor),
    };
    setStudents([...students, newStudent]);
    setStatus({ type: 'success', message: `Student ${name} registered successfully!` });
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
    setStatus({ type: 'info', message: 'Student removed.' });
  };

  const markAttendance = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Check if already marked today
    const today = new Date().toDateString();
    const alreadyMarked = attendance.some(
      record => record.studentId === studentId && new Date(record.timestamp).toDateString() === today
    );

    if (alreadyMarked) {
      // Don't spam status for already marked
      return;
    }

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      studentId,
      studentName: student.name,
      timestamp: Date.now(),
    };
    setAttendance([newRecord, ...attendance]);
    setStatus({ type: 'success', message: `Attendance marked for ${student.name}!` });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#141414] rounded-xl flex items-center justify-center text-white">
              <Camera size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Face Attendance Pro</h1>
          </div>
          <nav className="flex gap-1 bg-[#E4E3E0] p-1 rounded-lg">
            <TabButton 
              active={activeTab === 'attendance'} 
              onClick={() => setActiveTab('attendance')}
              icon={<Camera size={18} />}
              label="Attendance"
            />
            <TabButton 
              active={activeTab === 'students'} 
              onClick={() => setActiveTab('students')}
              icon={<Users size={18} />}
              label="Students"
            />
            <TabButton 
              active={activeTab === 'records'} 
              onClick={() => setActiveTab('records')}
              icon={<ClipboardList size={18} />}
              label="Records"
            />
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Status Toast */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "mb-6 p-4 rounded-xl flex items-center gap-3 border shadow-sm",
                status.type === 'success' ? "bg-green-50 border-green-200 text-green-800" :
                status.type === 'error' ? "bg-red-50 border-red-200 text-red-800" :
                "bg-blue-50 border-blue-200 text-blue-800"
              )}
            >
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="font-medium">{status.message}</p>
              <button 
                onClick={() => setStatus(null)}
                className="ml-auto hover:opacity-70 p-1"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isModelsLoaded ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[#141414] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#141414]/60 font-medium italic">Initializing face recognition models...</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {activeTab === 'attendance' && (
              <AttendanceView students={students} onMarkAttendance={markAttendance} />
            )}
            {activeTab === 'students' && (
              <StudentsView 
                students={students} 
                onAddStudent={addStudent} 
                onRemoveStudent={removeStudent} 
              />
            )}
            {activeTab === 'records' && (
              <RecordsView records={attendance} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
        active ? "bg-white text-[#141414] shadow-sm" : "text-[#141414]/60 hover:text-[#141414] hover:bg-white/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Views ---

function AttendanceView({ students, onMarkAttendance }: { students: Student[]; onMarkAttendance: (id: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
        }
      })
      .catch(err => console.error(err));
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsScanning(false);
    }
  };

  const handleIdentify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || students.length === 0) return;

    const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length > 0) {
      const faceMatcher = new faceapi.FaceMatcher(
        students.map(s => new faceapi.LabeledFaceDescriptors(s.id, [new Float32Array(s.descriptor)])),
        0.6
      );

      detections.forEach(detection => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        if (bestMatch.label !== 'unknown') {
          onMarkAttendance(bestMatch.label);
        }
      });
    }
  }, [students, onMarkAttendance]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(handleIdentify, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning, handleIdentify]);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-2xl border border-[#141414]/10 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Camera size={20} className="text-[#141414]/60" />
          Live Scanner
        </h2>
        <div className="relative aspect-video bg-[#141414] rounded-xl overflow-hidden mb-4">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <button
                onClick={startVideo}
                className="bg-white text-[#141414] px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Camera size={20} />
                Start Scanner
              </button>
            </div>
          )}
        </div>
        {isScanning && (
          <button
            onClick={stopVideo}
            className="w-full py-3 border-2 border-[#141414] rounded-xl font-bold hover:bg-[#141414] hover:text-white transition-all"
          >
            Stop Scanner
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#141414]/10 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users size={20} className="text-[#141414]/60" />
          Instructions
        </h2>
        <ul className="space-y-4 text-[#141414]/70">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-[#E4E3E0] rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <p>Ensure you have registered students in the <strong>Students</strong> tab first.</p>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-[#E4E3E0] rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <p>Click <strong>Start Scanner</strong> to activate your camera.</p>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-[#E4E3E0] rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <p>Position your face clearly in front of the camera. The system will automatically detect and mark attendance.</p>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-[#E4E3E0] rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <p>A success message will appear when a student is recognized.</p>
          </li>
        </ul>
      </div>
    </div>
  );
}

function StudentsView({ students, onAddStudent, onRemoveStudent }: { students: Student[]; onAddStudent: (name: string, desc: Float32Array) => void; onRemoveStudent: (id: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCapture = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCapturing(true);
        }
      })
      .catch(err => console.error(err));
  };

  const stopCapture = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCapturing(false);
    }
  };

  const handleRegister = async () => {
    if (!videoRef.current || !name.trim()) return;

    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      onAddStudent(name, detection.descriptor);
      setName('');
      setIsAdding(false);
      stopCapture();
    } else {
      alert('No face detected. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold italic serif">Manage Students</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            startCapture();
          }}
          className="bg-[#141414] text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <UserPlus size={18} />
          Register Student
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-2xl border-2 border-[#141414] overflow-hidden"
          >
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-video bg-[#141414] rounded-xl overflow-hidden relative">
                <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                {!isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button onClick={startCapture} className="bg-white text-black px-4 py-2 rounded-full font-bold">Restart Camera</button>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#141414]/50 mb-1">Student Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#141414]/20"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRegister}
                    disabled={!name.trim()}
                    className="flex-1 bg-[#141414] text-white py-3 rounded-xl font-bold disabled:opacity-50"
                  >
                    Capture & Register
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      stopCapture();
                    }}
                    className="px-6 py-3 border border-[#141414]/10 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[#141414]/10 rounded-2xl">
            <Users size={48} className="mx-auto mb-4 text-[#141414]/20" />
            <p className="text-[#141414]/50 font-medium">No students registered yet.</p>
          </div>
        ) : (
          students.map(student => (
            <motion.div
              layout
              key={student.id}
              className="bg-white p-4 rounded-xl border border-[#141414]/10 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E4E3E0] rounded-full flex items-center justify-center font-bold text-[#141414]/60">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold">{student.name}</p>
                  <p className="text-xs text-[#141414]/40 font-mono uppercase tracking-tighter">ID: {student.id.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => onRemoveStudent(student.id)}
                className="p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function RecordsView({ records }: { records: AttendanceRecord[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#141414]/10 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-[#141414]/10 flex items-center justify-between">
        <h2 className="text-xl font-bold italic serif">Attendance Records</h2>
        <div className="text-xs font-mono bg-[#E4E3E0] px-3 py-1 rounded-full uppercase tracking-wider">
          Total: {records.length}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F5F5F0]">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#141414]/50">Student Name</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#141414]/50">Date</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#141414]/50">Time</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#141414]/50 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]/5">
            {records.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-[#141414]/40 italic">
                  No attendance records found.
                </td>
              </tr>
            ) : (
              records.map(record => (
                <tr key={record.id} className="hover:bg-[#F5F5F0]/50 transition-colors">
                  <td className="px-6 py-4 font-bold">{record.studentName}</td>
                  <td className="px-6 py-4 text-[#141414]/60">{new Date(record.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-mono text-sm">{new Date(record.timestamp).toLocaleTimeString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-tighter">
                      <CheckCircle2 size={12} />
                      Present
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
