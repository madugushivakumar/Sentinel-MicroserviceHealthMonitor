import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Load projects on mount
  useEffect(() => {
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
    try {
      setLoading(true);
      const res = await getProjects();
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProject = (project) => {
    setSelectedProject(project);
    localStorage.setItem('selectedProjectId', project.id);
  };

  const refreshProjects = () => {
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

