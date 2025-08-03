import React from 'react';
import { ShieldCheck, LayoutTemplate, DatabaseZap, SlidersHorizontal, BarChart2, Users, Wrench, FileText, Server, Code, GanttChartSquare } from 'lucide-react';

// Main component to display the Admin Dashboard Implementation Plan
const AdminDashboardPlanInfographic = () => {
  const phases = [
    {
      phase: "Phase 0",
      title: "Foundation & Data Migration",
      icon: <GanttChartSquare className="w-8 h-8 text-white" />,
      color: "bg-gray-800",
      tasks: [
        {
          icon: <ShieldCheck className="w-6 h-6 text-green-500" />,
          title: "Secure Admin Section",
          description: "Protect all admin pages and API endpoints with role-based access control.",
        },
        {
          icon: <LayoutTemplate className="w-6 h-6 text-blue-500" />,
          title: "Create Admin Layout",
          description: "Build a reusable layout with a persistent sidebar for easy navigation.",
        },
        {
          icon: <DatabaseZap className="w-6 h-6 text-yellow-500" />,
          title: "Unify Flashcard Collections",
          description: "Run a one-time migration script to consolidate two collections into one, simplifying data management.",
        },
        {
            icon: <SlidersHorizontal className="w-6 h-6 text-purple-500" />,
            title: "Dynamic Configuration Model",
            description: "Move hardcoded constants to a database model to allow for dynamic updates from the dashboard.",
        },
      ],
    },
    {
      phase: "Phase 1",
      title: "Log Viewer",
      icon: <FileText className="w-8 h-8 text-white" />,
      color: "bg-indigo-600",
      tasks: [
        {
          icon: <Server className="w-6 h-6 text-gray-500" />,
          title: "Backend API for Logs",
          description: "Create an API to query and filter system and authentication logs with pagination.",
        },
        {
          icon: <Code className="w-6 h-6 text-pink-500" />,
          title: "Frontend Log Interface",
          description: "Develop a searchable UI with filters, date pickers, and a detailed view for log metadata.",
        },
      ],
    },
    {
      phase: "Phase 2",
      title: "Analytics Dashboard",
      icon: <BarChart2 className="w-8 h-8 text-white" />,
      color: "bg-blue-600",
      tasks: [
        {
          icon: <Server className="w-6 h-6 text-gray-500" />,
          title: "Analytics Aggregation API",
          description: "Build endpoints using MongoDB aggregation pipelines to compute user, usage, and content stats.",
        },
        {
          icon: <Code className="w-6 h-6 text-pink-500" />,
          title: "Frontend Dashboard UI",
          description: "Visualize key metrics with stat cards and charts for user sign-ups, study sessions, and top content.",
        },
      ],
    },
    {
      phase: "Phase 3",
      title: "User Management",
      icon: <Users className="w-8 h-8 text-white" />,
      color: "bg-green-600",
      tasks: [
        {
          icon: <Server className="w-6 h-6 text-gray-500" />,
          title: "User Management API",
          description: "Develop endpoints to list, search, and update user roles and account status (active/suspended).",
        },
        {
          icon: <Code className="w-6 h-6 text-pink-500" />,
          title: "Frontend User Table",
          description: "Create a user-friendly table to view all users and perform actions like changing roles or resetting passwords.",
        },
      ],
    },
    {
      phase: "Phase 4",
      title: "App Configuration",
      icon: <Wrench className="w-8 h-8 text-white" />,
      color: "bg-purple-600",
      tasks: [
        {
          icon: <Server className="w-6 h-6 text-gray-500" />,
          title: "Configuration API",
          description: "Build API endpoints to read and write application constants, such as rate limits, to the database.",
        },
        {
          icon: <Code className="w-6 h-6 text-pink-500" />,
          title: "Frontend Settings UI",
          description: "Design a form that allows admins to update these constants dynamically without a code deployment.",
        },
      ],
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 tracking-tight">
            Admin Dashboard Implementation Plan
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            A strategic, phased approach to building a comprehensive internal tool for application monitoring, management, and configuration.
          </p>
        </header>

        <div className="relative">
          {/* The vertical line connecting the phases */}
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-1 bg-gray-200 hidden md:block" aria-hidden="true"></div>

          {phases.map((phase, index) => (
            <div key={index} className="mb-16">
              {/* Phase Header */}
              <div className="flex items-center justify-center mb-6">
                <div className={`z-10 flex items-center justify-center w-16 h-16 rounded-full shadow-lg ${phase.color}`}>
                  {phase.icon}
                </div>
              </div>
              <div className="text-center mb-8">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">{phase.phase}</h2>
                <p className="text-2xl font-bold text-gray-800">{phase.title}</p>
              </div>

              {/* Tasks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {phase.tasks.map((task, taskIndex) => (
                  <div key={taskIndex} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 bg-gray-100 rounded-lg p-3">
                        {task.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <p className="mt-1 text-gray-600 text-sm">{task.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPlanInfographic;
