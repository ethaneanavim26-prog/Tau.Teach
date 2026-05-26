import { useState, useRef, useEffect } from "react";

import Sidebar from "../components/chat/Sidebar";
import MessageBubble from "../components/chat/MessageBubble";
import ChatInput from "../components/chat/ChatInput";
import { Menu } from "lucide-react";

const MATH_TOPICS = [
"Basic Algebra", "Advanced Algebra", "Geometry", "Trigonometry",
"Pre-Calculus", "Calculus 1", "Calculus 2", "Calculus 3",
"Linear Algebra", "Differential Equations", "Statistics & Probability"];

const LEVELS = ["Middle School", "High School", "Early College", "Advanced College"];

const SUGGESTIONS = [
"Solve a quadratic equation",
"Explain integration by parts",
"Help me with limits",
"What is the chain rule?"];