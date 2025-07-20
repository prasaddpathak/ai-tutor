import customtkinter as ctk
from tkinter import messagebox, simpledialog
from app.auth.face_auth import authenticate, register_face
from app.auth.camera import get_available_cameras
from app.database import db
import cv2
from PIL import Image, ImageTk
import threading

import time

class AITutorApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("AI Tutor - Login")
        self.geometry("800x600")

        self.login_frame = ctk.CTkFrame(self)
        self.login_frame.pack(pady=20, padx=60, fill="both", expand=True)

        self.label = ctk.CTkLabel(self.login_frame, text="Click Login or Register, then click Capture", font=ctk.CTkFont(size=20, weight="bold"))
        self.label.pack(pady=12, padx=10)

        self.camera_frame = ctk.CTkFrame(self.login_frame)
        self.camera_frame.pack(pady=10, padx=10, fill="both", expand=True)

        self.camera_label = ctk.CTkLabel(self.camera_frame, text="Camera will be shown here")
        self.camera_label.pack(pady=10, padx=10, fill="both", expand=True)

        self.button_frame = ctk.CTkFrame(self.login_frame)
        self.button_frame.pack(pady=10, padx=10)

        self.login_button = ctk.CTkButton(self.button_frame, text="Login", command=self._on_login_clicked)
        self.login_button.pack(side="left", padx=10)

        self.register_button = ctk.CTkButton(self.button_frame, text="Register", command=self._on_register_clicked)
        self.register_button.pack(side="left", padx=10)

        self.capture_button = ctk.CTkButton(self.button_frame, text="Capture", command=self._on_capture, state="disabled")
        self.capture_button.pack(side="left", padx=10)

        self.current_action = None # 'login' or 'register'
        self.student_name_for_registration = None
        self.cap = None # Initialize cap to None
        self.after_id = None # To store the ID of the after call
        self.landing_page = None # To store the instance of LandingPage

        self.camera_index = self._select_camera()
        if self.camera_index is None:
            self.destroy()
            return # Exit __init__ if no camera is selected

        if not self.winfo_exists(): # Check if the window was destroyed by _select_camera
            return

        if not self._initialize_camera():
            self.destroy()
            return

        self._start_camera_feed()
        self.protocol("WM_DELETE_WINDOW", self.on_closing) # Add protocol for closing

    def _initialize_camera(self):
        """Initialize the camera with retries."""
        for _ in range(3): # Try 3 times
            self.cap = cv2.VideoCapture(self.camera_index)
            if self.cap.isOpened():
                return True
            time.sleep(0.5) # Wait before retrying
        messagebox.showerror("Camera Error", "Failed to open camera. Please check if it's in use or properly connected.")
        return False


    def _start_camera_feed(self):
        if self.after_id:
            self.after_cancel(self.after_id)
        self._update_frame()

    def _update_frame(self):
        if not self.winfo_exists(): # Check if window still exists
            return
        if self.cap and self.cap.isOpened(): # Check if camera is open
            ret, frame = self.cap.read()
            if ret:
                img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(img)
                img = ctk.CTkImage(light_image=img, dark_image=img, size=(640, 480))
                self.camera_label.configure(image=img, text="")
                self.camera_label.image = img

        self.after_id = self.after(10, self._update_frame)

    def _on_login_clicked(self):
        self.current_action = 'login'
        self.label.configure(text="Ready for Login: Click Capture")
        self._enable_capture_button()

    def _on_register_clicked(self):
        name = simpledialog.askstring("Register", "Enter your name:")
        if not name:
            self._reset_ui()
            return
        self.student_name_for_registration = name
        self.current_action = 'register'
        self.label.configure(text=f"Ready to register {name}: Click Capture")
        self._enable_capture_button()

    def _on_capture(self):
        self._disable_all_buttons()
        self.label.configure(text="Processing...")
        
        if self.after_id:
            self.after_cancel(self.after_id) # Stop updating the frame

        ret, frame = self.cap.read()
        if not ret:
            messagebox.showerror("Capture Error", "Failed to capture frame.")
            self._reset_ui()
            self._start_camera_feed() # Restart feed
            return
        
        # Convert the frame to RGB before passing it to the auth functions
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        if self.current_action == 'login':
            threading.Thread(target=self._threaded_login, args=(rgb_frame,)).start()
        elif self.current_action == 'register':
            threading.Thread(target=self._threaded_register, args=(self.student_name_for_registration, rgb_frame)).start()

    def _threaded_login(self, frame):
        try:
            name = authenticate(frame)
            self.after(0, self._handle_auth_success, name)
        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Login Failed", str(e)))
            self.after(0, self._reset_ui)
            self.after(0, self._start_camera_feed) # Restart feed

    def _threaded_register(self, name, frame):
        try:
            register_face(name, frame)
            self.after(0, self._handle_auth_success, name)
        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Registration Failed", str(e)))
            self.after(0, self._reset_ui)
            self.after(0, self._start_camera_feed) # Restart feed

    def _handle_auth_success(self, name):
        student = db.get_student_by_name(name)
        if not student:
            level = self._prompt_for_difficulty()
            db.create_student(name, level)
            student = db.get_student_by_name(name)
        
        self.withdraw()
        if self.after_id:
            self.after_cancel(self.after_id)
        if self.cap:
            self.cap.release()
        self.landing_page = LandingPage(self, student)
        self.landing_page.protocol("WM_DELETE_WINDOW", self._on_landing_page_close)

    def _prompt_for_difficulty(self):
        dialog = DifficultyLevelDialog(self)
        return dialog.get_selection()

    def _select_camera(self):
        cameras = get_available_cameras()
        if not cameras:
            messagebox.showerror("Error", "No cameras found.")
            return None
        if len(cameras) == 1:
            return 0
        
        dialog = ctk.CTkInputDialog(text=f"Enter camera index (0 to {len(cameras) - 1}):", title="Select Camera")
        return int(dialog.get_input() or 0)

    def _enable_capture_button(self):
        self.login_button.configure(state="disabled")
        self.register_button.configure(state="disabled")
        self.capture_button.configure(state="normal")

    def _disable_all_buttons(self):
        self.login_button.configure(state="disabled")
        self.register_button.configure(state="disabled")
        self.capture_button.configure(state="disabled")

    def _reset_ui(self):
        self.current_action = None
        self.student_name_for_registration = None
        self.label.configure(text="Click Login or Register, then click Capture")
        self.login_button.configure(state="normal")
        self.register_button.configure(state="normal")
        self.capture_button.configure(state="disabled")

    def on_closing(self):
        if self.after_id:
            self.after_cancel(self.after_id)
        if self.cap:
            self.cap.release()
        self.destroy()

    def _on_landing_page_close(self):
        if self.landing_page:
            self.landing_page.destroy()
            self.landing_page = None
        self.deiconify() # Show the main window again
        # Re-initialize camera and update frame if needed
        if self.camera_index is not None:
            self.after(500, self._reinitialize_camera_and_start_feed) # Wait 500ms
        self._reset_ui()

    def _reinitialize_camera_and_start_feed(self):
        if self._initialize_camera():
            self._start_camera_feed()
        else:
            self.destroy() # Close if camera fails to re-initialize

    def _reinitialize_camera_and_start_feed(self):
        if self._initialize_camera():
            self._start_camera_feed()
        else:
            self.destroy() # Close if camera fails to re-initialize

class LandingPage(ctk.CTkToplevel):
    def __init__(self, parent, student):
        super().__init__(parent)
        self.title(f"Welcome, {student['name']}!")
        self.geometry("800x600")
        self.profile = student

        main_frame = ctk.CTkFrame(self)
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)

        header_frame = ctk.CTkFrame(main_frame)
        header_frame.pack(fill="x", pady=(0, 20))

        welcome_label = ctk.CTkLabel(header_frame, text=f"Welcome back, {self.profile['name']}!", font=ctk.CTkFont(size=24, weight="bold"))
        welcome_label.pack(pady=20)

        self.level_label = ctk.CTkLabel(header_frame, text=f"Difficulty Level: {self.profile['difficulty_level']}", font=ctk.CTkFont(size=16))
        self.level_label.pack(pady=(0, 10))

        content_frame = ctk.CTkFrame(main_frame)
        content_frame.pack(fill="both", expand=True, pady=(0, 20))

        subjects_label = ctk.CTkLabel(content_frame, text="Choose a Subject to Start Learning:", font=ctk.CTkFont(size=18, weight="bold"))
        subjects_label.pack(pady=(30, 20))

        subjects = db.get_all_subjects()
        subjects_frame = ctk.CTkFrame(content_frame)
        subjects_frame.pack(expand=True, fill="both", padx=20, pady=20)

        row, col = 0, 0
        for subject in subjects:
            btn = ctk.CTkButton(subjects_frame, text=subject['name'], width=200, height=80, font=ctk.CTkFont(size=14, weight="bold"), command=lambda s=subject: self._select_subject(s))
            btn.grid(row=row, column=col, padx=15, pady=15, sticky="nsew")
            col += 1
            if col > 2:
                col = 0
                row += 1

        for i in range(3):
            subjects_frame.grid_columnconfigure(i, weight=1)
        for i in range(row + 1):
            subjects_frame.grid_rowconfigure(i, weight=1)

        bottom_frame = ctk.CTkFrame(main_frame)
        bottom_frame.pack(fill="x")

        logout_btn = ctk.CTkButton(bottom_frame, text="Logout", command=self.logout, width=120, height=40)
        logout_btn.pack(side="right", padx=20, pady=15)

        profile_btn = ctk.CTkButton(bottom_frame, text="Edit Profile", command=self._edit_profile, width=120, height=40)
        profile_btn.pack(side="right", padx=(0, 10), pady=15)

    def logout(self):
        self.master._on_landing_page_close()

    def _select_subject(self, subject):
        messagebox.showinfo("Subject Selected", f"You selected {subject['name']}!\n\nThis will open the curriculum for {subject['name']} at {self.profile['difficulty_level']} level.\n\n(Feature coming in Stage 3)")

    def _edit_profile(self):
        dialog = DifficultyLevelDialog(self)
        new_level = dialog.get_selection()
        if new_level and new_level != self.profile['difficulty_level']:
            with db.get_connection() as conn:
                conn.execute('UPDATE students SET difficulty_level = ? WHERE id = ?', (new_level, self.profile['id']))
            self.profile['difficulty_level'] = new_level
            self.level_label.configure(text=f"Difficulty Level: {new_level}")
            messagebox.showinfo("Profile Updated", f"Difficulty level changed to {new_level}")

class DifficultyLevelDialog(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Select Difficulty Level")
        self.geometry("400x380")
        self.resizable(False, False)
        self.selected_level = None
        self.transient(parent)
        self.grab_set()

        title_label = ctk.CTkLabel(self, text="Choose your preferred difficulty level:", font=ctk.CTkFont(size=16, weight="bold"))
        title_label.pack(pady=(30, 30))

        self.levels = ["School", "High School", "Intermediate", "Advanced"]
        self.level_var = ctk.StringVar(value="School")

        for level in self.levels:
            radio = ctk.CTkRadioButton(self, text=level, variable=self.level_var, value=level, font=ctk.CTkFont(size=14))
            radio.pack(pady=12, anchor="w", padx=50)

        cancel_btn = ctk.CTkButton(self, text="Cancel", command=self._on_cancel, width=120, height=40)
        cancel_btn.pack(side="left", padx=(80, 10), pady=(40, 30))

        ok_btn = ctk.CTkButton(self, text="OK", command=self._on_ok, width=120, height=40)
        ok_btn.pack(side="right", padx=(10, 80), pady=(40, 30))

        self.protocol("WM_DELETE_WINDOW", self._on_cancel)

    def _on_ok(self):
        self.selected_level = self.level_var.get()
        self.destroy()

    def _on_cancel(self):
        self.selected_level = None
        self.destroy()

    def get_selection(self):
        self.wait_window()
        return self.selected_level

if __name__ == "__main__":
    app = AITutorApp()
    app.mainloop()