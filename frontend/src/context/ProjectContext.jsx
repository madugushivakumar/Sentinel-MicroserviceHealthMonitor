import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getProjects } from '../services/api';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  // Load projects on mount - ONLY ONCE
  useEffect(() => {
    if (loadedRef.current || loadingRef.current) return;
    loadedRef.current = true;
    loadingRef.current = true;
    loadProjects();
  }, []);

  // Load selected project from localStorage
  useEffect(() => {
    const savedProjectId = localStorage.getItem('selectedProjectId');
    if (savedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === savedProjectId);
      if (project) {
        setSelectedProject(project);
      } else if (projects.length > 0) {
        // If saved project doesn't exist, select first project
        setSelectedProject(projects[0]);
        localStorage.setItem('selectedProjectId', projects[0].id);
      }
    } else if (projects.length > 0 && !selectedProject) {
      // If no saved project, select first one
      setSelectedProject(projects[0]);
      localStorage.setItem('selectedProjectId', projects[0].id);
    }
  }, [projects]);

  const loadProjects = async () => {
    if (loadingRef.current) return; // Prevent concurrent loads
    try {
      loadingRef.current = true;
      setLoading(true);
      const res = await getProjects();
      setProjects(res.data);
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Rate limited: skipping project load');
        return;
      }
      console.error('Failed to load projects:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const selectProject = (project) => {
    setSelectedProject(project);
    localStorage.setItem('selectedProjectId', project.id);
  };

  const refreshProjects = () => {
    loadingRef.current = false; // Allow refresh
    loadedRef.current = false; // Reset loaded flag
    loadProjects();
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectProject,
        refreshProjects,
        loading
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

