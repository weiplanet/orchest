import { useAppContext } from "@/contexts/AppContext";
import { useAsync } from "@/hooks/useAsync";
import { useCustomRoute } from "@/hooks/useCustomRoute";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { fetcher, FetchError } from "@orchest/lib-utils";
import React from "react";
import { FILE_MANAGER_ENDPOINT, queryArgs } from "./common";

export const CreateFolderDialog = ({
  isOpen,
  root = "",
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  root?: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  // Global state
  const { setAlert } = useAppContext();
  const { projectUuid } = useCustomRoute();

  // local states

  const [folderPath, setFolderPath] = React.useState(() => "");

  const { run, setError, error, status: createFolderStatus } = useAsync<
    void,
    FetchError
  >();
  const isCreating = createFolderStatus === "PENDING";
  const onSubmitModal = async () => {
    if (isCreating) return;

    await run(
      fetcher(
        `${FILE_MANAGER_ENDPOINT}/${projectUuid}/create-dir?${queryArgs({
          path: `/${folderPath}/`,
          root,
        })}`,
        { method: "POST" }
      ).then(() => {
        onSuccess();
      })
    );

    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      setFolderPath("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (error) {
      setAlert(
        "Error",
        `Unable to create file. ${error.message}`,
        (resolve) => {
          setError(null);
          resolve(true);
          return true;
        }
      );
    }
  }, [setAlert, setError, error]);

  return (
    <Dialog
      open={isOpen}
      onClose={isCreating ? undefined : onClose}
      data-test-id="file-manager-create-new-folder-dialog"
      maxWidth="sm"
      fullWidth
    >
      <form
        id="create-folder"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmitModal();
        }}
      >
        <DialogTitle>Enter the desired folder name</DialogTitle>
        <DialogContent>
          <TextField
            label="Folder name"
            autoFocus
            value={folderPath}
            fullWidth
            disabled={isCreating}
            onChange={(e) => setFolderPath(e.target.value)}
            data-test-id="file-manager-file-name-textfield"
            sx={{ marginTop: (theme) => theme.spacing(2) }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<CloseIcon />}
            color="secondary"
            onClick={isCreating ? undefined : onClose}
            tabIndex={-1}
          >
            Cancel
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            type="submit"
            form="create-folder"
            disabled={isCreating}
            data-test-id="file-manager-create-folder"
          >
            Create folder
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
