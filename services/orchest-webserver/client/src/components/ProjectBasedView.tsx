import { useCustomRoute } from "@/hooks/useCustomRoute";
import { siteMap } from "@/Routes";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import React from "react";

export interface IProjectBasedViewProps {
  projectUuid?: string;
}

const ProjectBasedView: React.FC<IProjectBasedViewProps> = ({
  projectUuid,
  children,
}) => {
  const { navigateTo } = useCustomRoute();

  const goToProjects = (e: React.MouseEvent) =>
    navigateTo(siteMap.projects.path, undefined, e);
  const message =
    "It looks like you don't have any projects yet! To get started using Orchest create your first project.";

  return (
    <div className="view-page">
      {projectUuid ? (
        children
      ) : (
        <div>
          <p className="push-down">{message}</p>
          <Button
            variant="contained"
            onClick={goToProjects}
            onAuxClick={goToProjects}
            startIcon={<AddIcon />}
            autoFocus
          >
            Create your first project!
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProjectBasedView;
