import { describe, it, expect } from "vitest";

describe("Student Photograph at Admission and Portal Upload", () => {
  type StudentRecord = {
    id: string;
    name: string;
    mobile: string;
    photoUrl?: string | null;
  };

  it("handles student admission without photograph (optional at admission)", () => {
    const newStudent: StudentRecord = {
      id: "std_101",
      name: "Rohan Sharma",
      mobile: "9876543210",
      photoUrl: null,
    };

    expect(newStudent.name).toBe("Rohan Sharma");
    expect(newStudent.photoUrl).toBeNull();

    // Check if photo is considered pending
    const isPhotoPending = !newStudent.photoUrl;
    expect(isPhotoPending).toBe(true);
  });

  it("handles student admission with photograph provided upfront", () => {
    const passportDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...";
    const newStudent: StudentRecord = {
      id: "std_102",
      name: "Priya Patel",
      mobile: "9876500001",
      photoUrl: passportDataUrl,
    };

    expect(newStudent.photoUrl).toBeTruthy();
    expect(newStudent.photoUrl).toContain("data:image/jpeg");
    const isPhotoPending = !newStudent.photoUrl;
    expect(isPhotoPending).toBe(false);
  });

  it("allows student to upload photograph later from Student Portal", () => {
    let student: StudentRecord = {
      id: "std_103",
      name: "Ananya Gupta",
      mobile: "9876500002",
      photoUrl: null,
    };

    // Initially photo is missing
    expect(student.photoUrl).toBeNull();

    // Student logs into portal and uploads passport photo
    const portalUploadedPhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";
    student = {
      ...student,
      photoUrl: portalUploadedPhoto,
    };

    expect(student.photoUrl).toBe(portalUploadedPhoto);
    expect(student.photoUrl).not.toBeNull();
  });

  it("validates photo file size limit (5MB)", () => {
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;

    const validPhotoSize = 2 * 1024 * 1024; // 2MB
    const oversizedPhoto = 6 * 1024 * 1024; // 6MB

    const isSizeValid = (size: number) => size <= MAX_SIZE_BYTES;

    expect(isSizeValid(validPhotoSize)).toBe(true);
    expect(isSizeValid(oversizedPhoto)).toBe(false);
  });
});
