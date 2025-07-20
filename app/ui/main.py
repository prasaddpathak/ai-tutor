

import customtkinter as ctk
from tkinter import messagebox, simpledialog
from app.auth.face_auth import authenticate, register_face
from app.auth.camera import get_available_cameras
from app.database import db
from app.curriculum.curriculum_service import generate_topics, generate_chapters
import cv2
from PIL import Image, ImageTk
import threading
import time
import re

class AITutorApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("AI Tutor")
        self.geometry("1280x720")
        self.resizable(False, False)

        self.topic_cache = {}
        self.chapter_cache = {}
        self.student = None
        self.current_view = None

        self.container = ctk.CTkFrame(self)
        self.container.pack(fill="both", expand=True)

        self.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.show_login_view()

    def show_login_view(self):
        self.title("AI Tutor - Login")
        if self.current_view:
            self.current_view.destroy()
        self.current_view = LoginView(self.container, self)
        self.current_view.pack(fill="both", expand=True)

    def show_main_view(self, student):
        self.title(f"AI Tutor - Welcome, {student['name']}!")
        self.student = student
        if self.current_view:
            self.current_view.destroy()
        self.current_view = MainView(self.container, self)
        self.current_view.pack(fill="both", expand=True)

    def on_closing(self):
        if self.current_view and hasattr(self.current_view, 'on_closing'):
            self.current_view.on_closing()
        self.destroy()

class LoginView(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

        self.label = ctk.CTkLabel(self, text="Click Login or Register, then click Capture", font=ctk.CTkFont(size=20, weight="bold"))
        self.label.pack(pady=12, padx=10)

        self.camera_frame = ctk.CTkFrame(self)
        self.camera_frame.pack(pady=10, padx=10, fill="both", expand=True)

        self.camera_label = ctk.CTkLabel(self.camera_frame, text="Camera will be shown here")
        self.camera_label.pack(pady=10, padx=10, fill="both", expand=True)

        self.button_frame = ctk.CTkFrame(self)
        self.button_frame.pack(pady=10, padx=10)

        self.login_button = ctk.CTkButton(self.button_frame, text="Login", command=self._on_login_clicked)
        self.login_button.pack(side="left", padx=10)

        self.register_button = ctk.CTkButton(self.button_frame, text="Register", command=self._on_register_clicked)
        self.register_button.pack(side="left", padx=10)

        self.capture_button = ctk.CTkButton(self.button_frame, text="Capture", command=self._on_capture, state="disabled")
        self.capture_button.pack(side="left", padx=10)

        self.current_action = None
        self.student_name_for_registration = None
        self.cap = None
        self.after_id = None

        self.camera_index = self._select_camera()
        if self.camera_index is None:
            self.controller.destroy()
            return

        if not self.winfo_exists():
            return

        if not self._initialize_camera():
            self.controller.destroy()
            return

        self._start_camera_feed()

    def _initialize_camera(self):
        for _ in range(3):
            self.cap = cv2.VideoCapture(self.camera_index)
            if self.cap.isOpened():
                return True
            time.sleep(0.5)
        messagebox.showerror("Camera Error", "Failed to open camera.")
        return False

    def _start_camera_feed(self):
        if self.after_id:
            self.after_cancel(self.after_id)
        self._update_frame()

    def _update_frame(self):
        if not self.winfo_exists():
            return
        if self.cap and self.cap.isOpened():
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
            self.after_cancel(self.after_id)
        ret, frame = self.cap.read()
        if not ret:
            messagebox.showerror("Capture Error", "Failed to capture frame.")
            self._reset_ui()
            self._start_camera_feed()
            return
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
            self.after(0, self._start_camera_feed)

    def _threaded_register(self, name, frame):
        try:
            register_face(name, frame)
            self.after(0, self._handle_auth_success, name)
        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Registration Failed", str(e)))
            self.after(0, self._reset_ui)
            self.after(0, self._start_camera_feed)

    def _handle_auth_success(self, name):
        student = db.get_student_by_name(name)
        if not student:
            level = self._prompt_for_difficulty()
            db.create_student(name, level)
            student = db.get_student_by_name(name)
        
        self.on_closing()
        self.controller.show_main_view(student)

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
        if self.cap and self.cap.isOpened():
            self.cap.release()
        self.cap = None

class MainView(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller
        self.student = self.controller.student
        self.current_frame = None
        self.history = []

        self.show_subjects()

    def show_subjects(self):
        self.clear_current_frame()
        self.history.append(self.show_subjects)
        self.current_frame = SubjectsView(self, self)
        self.current_frame.pack(fill="both", expand=True)

    def show_topics(self, subject):
        self.clear_current_frame()
        self.history.append(lambda: self.show_topics(subject))
        self.current_frame = TopicsView(self, self, subject)
        self.current_frame.pack(fill="both", expand=True)

    def show_chapters(self, topic_title, subject):
        self.clear_current_frame()
        self.history.append(lambda: self.show_chapters(topic_title, subject))
        self.current_frame = ChaptersView(self, self, topic_title, subject)
        self.current_frame.pack(fill="both", expand=True)

    def go_back(self):
        if len(self.history) > 1:
            self.history.pop()
            previous_view_func = self.history.pop()
            previous_view_func()

    def clear_current_frame(self):
        if self.current_frame:
            self.current_frame.destroy()
        self.current_frame = None
    
    def on_closing(self):
        pass

class SubjectsView(ctk.CTkFrame):
    def __init__(self, parent, main_view_controller):
        super().__init__(parent)
        self.main_view_controller = main_view_controller

        header_frame = ctk.CTkFrame(self)
        header_frame.pack(fill="x", pady=(0, 20), padx=20)

        welcome_label = ctk.CTkLabel(header_frame, text=f"Welcome back, {self.main_view_controller.student['name']}!", font=ctk.CTkFont(size=24, weight="bold"))
        welcome_label.pack(pady=10)

        subjects_label = ctk.CTkLabel(self, text="Choose a Subject to Start Learning:", font=ctk.CTkFont(size=18, weight="bold"))
        subjects_label.pack(pady=(10, 20))

        subjects = db.get_all_subjects()
        scrollable_frame = ctk.CTkScrollableFrame(self)
        scrollable_frame.pack(expand=True, fill="both", padx=20, pady=20)

        for i, subject in enumerate(subjects):
            btn = ctk.CTkButton(scrollable_frame, text=subject['name'], font=ctk.CTkFont(size=14, weight="bold"),
                                command=lambda s=subject: self.main_view_controller.show_topics(s))
            btn.pack(pady=10, padx=20, fill="x")

class TopicsView(ctk.CTkFrame):
    def __init__(self, parent, main_view_controller, subject):
        super().__init__(parent)
        self.main_view_controller = main_view_controller
        self.subject = subject

        header_frame = ctk.CTkFrame(self)
        header_frame.pack(fill="x", pady=(0, 10), padx=10)

        back_button = ctk.CTkButton(header_frame, text="< Back to Subjects", command=self.main_view_controller.go_back)
        back_button.pack(side="left", padx=10, pady=10)

        title_label = ctk.CTkLabel(header_frame, text=f"Topics for {self.subject['name']}", font=ctk.CTkFont(size=20, weight="bold"))
        title_label.pack(side="left", expand=True, pady=10, padx=20)

        self.scrollable_frame = ctk.CTkScrollableFrame(self)
        self.scrollable_frame.pack(expand=True, fill="both", padx=20, pady=20)
        
        self.loading_label = ctk.CTkLabel(self.scrollable_frame, text="Loading topics...", font=ctk.CTkFont(size=16))
        self.loading_label.pack(pady=20)

        self.load_topics()

    def load_topics(self):
        if self.subject['name'] in self.main_view_controller.controller.topic_cache:
            self.display_topics(self.main_view_controller.controller.topic_cache[self.subject['name']])
        else:
            threading.Thread(target=self._threaded_load_topics, daemon=True).start()

    def _threaded_load_topics(self):
        try:
            topics = generate_topics(self.subject['name'], self.main_view_controller.student['difficulty_level'])
            self.main_view_controller.controller.topic_cache[self.subject['name']] = topics
            self.after(0, self.display_topics, topics)
        except Exception as e:
            self.after(0, self.show_error, f"Failed to generate curriculum: {e}")

    def display_topics(self, topics):
        self.loading_label.pack_forget()
        if not topics:
            messagebox.showinfo("Curriculum", "Could not generate topics for this subject.")
            self.main_view_controller.go_back()
            return

        for topic_text in topics:
            self.create_topic_tile(topic_text)

    def create_topic_tile(self, topic_text):
        match = re.match(r'\*\*(.*?)\*\*(.*)', topic_text)
        if match:
            title, description = match.groups()
            title = title.strip()
            description = description.strip()
        else:
            title = topic_text.strip()
            description = ""

        if not title:
            return

        tile_frame = ctk.CTkFrame(self.scrollable_frame, corner_radius=10, fg_color="#3b8ed0")
        tile_frame.pack(pady=5, padx=10, fill="x")

        tile_frame.bind("<Enter>", lambda e, f=tile_frame: f.configure(fg_color="#36719f"))
        tile_frame.bind("<Leave>", lambda e, f=tile_frame: f.configure(fg_color="#3b8ed0"))

        title_label = ctk.CTkLabel(tile_frame, text=title, font=ctk.CTkFont(size=16, weight="bold"), anchor="w", fg_color="transparent")
        title_label.pack(pady=(10, 5), padx=20, fill="x")

        if description:
            desc_label = ctk.CTkLabel(tile_frame, text=description, wraplength=900, anchor="w", fg_color="transparent")
            desc_label.pack(pady=(0, 10), padx=20, fill="x")
        
        command = lambda event, t=title: self.main_view_controller.show_chapters(t, self.subject)
        tile_frame.bind("<Button-1>", command)
        title_label.bind("<Button-1>", command)
        if description:
            desc_label.bind("<Button-1>", command)

    def show_error(self, message):
        messagebox.showerror("Error", message)
        self.main_view_controller.go_back()

class ChaptersView(ctk.CTkFrame):
    def __init__(self, parent, main_view_controller, topic_title, subject):
        super().__init__(parent)
        self.main_view_controller = main_view_controller
        self.topic_title = topic_title
        self.subject = subject

        header_frame = ctk.CTkFrame(self)
        header_frame.pack(fill="x", pady=(0, 10), padx=10)

        back_button = ctk.CTkButton(header_frame, text="< Back to Topics", command=self.main_view_controller.go_back)
        back_button.pack(side="left", padx=10, pady=10)

        title_label = ctk.CTkLabel(header_frame, text=f"Chapters for {self.topic_title}", font=ctk.CTkFont(size=20, weight="bold"))
        title_label.pack(side="left", expand=True, pady=10, padx=20)

        self.content_pane = ctk.CTkFrame(self, fg_color="transparent")
        self.content_pane.pack(expand=True, fill="both", padx=10, pady=10)
        self.content_pane.grid_columnconfigure(1, weight=1)
        self.content_pane.grid_rowconfigure(0, weight=1)

        self.nav_pane = ctk.CTkScrollableFrame(self.content_pane, width=350)
        self.nav_pane.grid(row=0, column=0, padx=(0, 10), pady=10, sticky="ns")
        self.content_pane.grid_columnconfigure(0, weight=0)

        self.text_pane = ctk.CTkTextbox(self.content_pane, wrap="word")
        self.text_pane.grid(row=0, column=1, pady=10, sticky="nsew")
        self.text_pane.insert("1.0", "Select a chapter to view its content.")
        self.text_pane.configure(state="disabled")

        self.loading_label = ctk.CTkLabel(self.nav_pane, text="Loading chapters...", font=ctk.CTkFont(size=16))
        self.loading_label.pack(pady=20)

        self.load_chapters()

    def load_chapters(self):
        cache_key = f"{self.subject['name']}_{self.topic_title}"
        if cache_key in self.main_view_controller.controller.chapter_cache:
            self.display_chapters_nav(self.main_view_controller.controller.chapter_cache[cache_key])
        else:
            threading.Thread(target=self._threaded_load_chapters, args=(cache_key,), daemon=True).start()

    def _threaded_load_chapters(self, cache_key):
        try:
            chapters = generate_chapters(self.topic_title, self.main_view_controller.student['difficulty_level'])
            self.main_view_controller.controller.chapter_cache[cache_key] = chapters
            self.after(0, self.display_chapters_nav, chapters)
        except Exception as e:
            self.after(0, self.show_error, f"Failed to generate chapters: {e}")

    def display_chapters_nav(self, chapters):
        self.loading_label.pack_forget()
        if not chapters:
            messagebox.showinfo("Chapters", f"Could not generate chapters for {self.topic_title}.")
            self.main_view_controller.go_back()
            return

        for chapter_text in chapters:
            self.create_chapter_nav_item(chapter_text)

    def create_chapter_nav_item(self, chapter_text):
        match = re.match(r'\*\*(.*?)\*\*', chapter_text)
        title = match.group(1).strip() if match else chapter_text.split('\n')[0].strip()

        if not title:
            return

        nav_item = ctk.CTkButton(self.nav_pane, text=title, anchor="w",
                                 command=lambda c=chapter_text: self.display_chapter_content(c))
        nav_item.pack(fill="x", padx=10, pady=5)

    def display_chapter_content(self, chapter_content):
        self.text_pane.configure(state="normal")
        self.text_pane.delete("1.0", "end")
        self.text_pane.insert("1.0", chapter_content)
        self.text_pane.configure(state="disabled")

    def show_error(self, message):
        messagebox.showerror("Error", message)
        self.main_view_controller.go_back()

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
