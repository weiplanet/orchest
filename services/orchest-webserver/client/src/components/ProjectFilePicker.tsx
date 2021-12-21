import { useAppContext } from "@/contexts/AppContext";
import { FileTree } from "@/types";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import {
  absoluteToRelativePath,
  ALLOWED_STEP_EXTENSIONS,
  extensionFromFilename,
  makeCancelable,
  makeRequest,
  PromiseManager,
} from "@orchest/lib-utils";
import React from "react";
import { Code } from "./common/Code";
import FilePicker from "./FilePicker";

const ProjectFilePicker: React.FC<{
  [key: string]: any;
  menuMaxWidth?: string;
}> = (props) => {
  const { setAlert } = useAppContext();

  const [state, setState] = React.useState<{
    tree: FileTree;
    [key: string]: any;
  }>({
    createFileModal: false,
    selectedFileExists: null,
    fileName: "",
    selectedExtension: "." + ALLOWED_STEP_EXTENSIONS[0],
    createFileDir: "",
    tree: undefined,
    cwd: null,
  });

  const [promiseManager] = React.useState(new PromiseManager());

  const onChangeFileValue = (value) => props.onChange(value);

  const fetchDirectoryDetails = () => {
    // will be populated by async requests
    let tree, cwd;

    let promises = [];

    let treeFetchPromise = makeCancelable(
      makeRequest("GET", `/async/file-picker-tree/${props.project_uuid}`),
      promiseManager
    );
    promises.push(treeFetchPromise.promise);
    treeFetchPromise.promise
      .then((response) => {
        tree = JSON.parse(response);
      })
      .catch((error) => {
        if (!error.isCanceled) {
          console.log(error);
        }
      });

    let cwdFetchPromise = makeCancelable(
      makeRequest(
        "GET",
        `/async/file-picker-tree/pipeline-cwd/${props.project_uuid}/${props.pipeline_uuid}`
      ),
      promiseManager
    );
    promises.push(cwdFetchPromise.promise);

    cwdFetchPromise.promise
      .then((response) => {
        // FilePicker cwd expects trailing / for cwd paths
        cwd = JSON.parse(response)["cwd"] + "/";
      })
      .catch((error) => {
        if (!error.isCanceled) {
          console.log(error);
        }
      });

    Promise.all(promises)
      .then(() => {
        setState((prevState) => ({
          ...prevState,
          tree,
          cwd,
        }));
      })
      .catch((error) => {
        if (!error.isCanceled) {
          console.error(error);
        }
      });
  };

  const valueValidator = (value) => {
    if (value == "" && value.endsWith("/")) {
      return false;
    }
    let ext = extensionFromFilename(value);
    if (ALLOWED_STEP_EXTENSIONS.indexOf(ext) === -1) {
      return false;
    }
    return true;
  };

  const checkFileValidity = () => {
    // only check file existence if it passes rule based validation
    if (valueValidator(props.value)) {
      let existencePromise = makeCancelable(
        makeRequest(
          "POST",
          `/async/project-files/exists/${props.project_uuid}/${props.pipeline_uuid}`,
          {
            type: "json",
            content: {
              relative_path: props.value,
            },
          }
        ),
        promiseManager
      );

      existencePromise.promise
        .then(() => {
          setState((prevState) => ({
            ...prevState,
            selectedFileExists: true,
          }));
        })
        .catch((e) => {
          if (!e.isCanceled) {
            // rely on 404 behaviour for detecting file existence
            setState((prevState) => ({
              ...prevState,
              selectedFileExists: true,
            }));
          }
        });
    } else {
      // do indicate invalid value for these value
      setState((prevState) => ({
        ...prevState,
        selectedFileExists: false,
      }));
    }
  };

  const onCreateFile = (dir) => {
    let fileNameProposal = "";
    if (props.value) {
      fileNameProposal = props.value
        .split("/")
        .slice(-1)
        .join("/")
        .split(".")[0];
    }

    setState((prevState) => ({
      ...prevState,
      fileName: fileNameProposal,
      createFileDir: dir,
      createFileModal: true,
    }));
  };

  const getFullProjectPath = () =>
    state.createFileDir + state.fileName + state.selectedExtension;

  const onCloseCreateFileModal = () =>
    setState((prevState) => ({
      ...prevState,
      createFileModal: false,
    }));

  const onChangeNewFilename = (value) =>
    setState((prevState) => ({ ...prevState, fileName: value }));

  const onChangeNewFilenameExtension = (value: string) =>
    setState((prevState) => ({ ...prevState, selectedExtension: value }));

  const onSubmitModal = () => {
    // validate extensions
    let extension = extensionFromFilename(getFullProjectPath());

    // TODO: case insensitive extension checking?
    if (ALLOWED_STEP_EXTENSIONS.indexOf(extension) == -1) {
      setAlert(
        "Error",
        <div>
          <p>Invalid file extension</p>
          Extension {extension} is not in allowed set of{" "}
          {allowedExtensionsMarkup()}.
        </div>
      );

      return;
    }

    let createPromise = makeCancelable(
      makeRequest(
        "POST",
        `/async/project-files/create/${props.project_uuid}/${props.pipeline_uuid}/${props.step_uuid}`,
        {
          type: "json",
          content: {
            file_path: getFullProjectPath(),
          },
        }
      ),
      promiseManager
    );

    createPromise.promise
      .then(() => {
        onChangeFileValue(
          absoluteToRelativePath(getFullProjectPath(), state.cwd).slice(1)
        );

        setState((prevState) => ({
          ...prevState,
          createFileModal: false,
        }));

        // fetch file tree again with new file in it
        fetchDirectoryDetails();
      })
      .catch((error) => {
        if (error.status == 409) {
          setAlert("Error", "A file with this name already exists.");
        }
        console.log(error);
      });
  };

  const onFocus = () => fetchDirectoryDetails();

  const allowedExtensionsMarkup = () => {
    return ALLOWED_STEP_EXTENSIONS.map((el, index) => {
      return (
        <span key={el}>
          <Code>.{el}</Code>
          {index < ALLOWED_STEP_EXTENSIONS.length - 1 ? (
            <React.Fragment>&nbsp;, </React.Fragment>
          ) : (
            ""
          )}
        </span>
      );
    });
  };

  React.useEffect(() => {
    fetchDirectoryDetails();
    checkFileValidity();

    return () => promiseManager.cancelCancelablePromises();
  }, []);

  React.useEffect(() => checkFileValidity(), [props.value]);

  return (
    <>
      <Dialog
        open={state.createFileModal}
        onClose={onCloseCreateFileModal}
        data-test-id="project-file-picker-create-new-file-dialog"
      >
        <form
          id="create-file"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSubmitModal();
          }}
        >
          <DialogTitle>Create a new file</DialogTitle>
          <DialogContent>
            <div className="create-file-input">
              <div className="push-down">
                Supported file extensions are:&nbsp;
                {allowedExtensionsMarkup()}.
              </div>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="File name"
                  autoFocus
                  value={state.fileName}
                  fullWidth
                  onChange={(e) => onChangeNewFilename(e.target.value)}
                  data-test-id="project-file-picker-file-name-textfield"
                />
                <FormControl fullWidth>
                  <InputLabel id="project-file-picker-file-extension-label">
                    Extension
                  </InputLabel>
                  <Select
                    label="Extension"
                    labelId="project-file-picker-file-extension-label"
                    id="project-file-picker-file-extension"
                    value={state.selectedExtension}
                    onChange={(e) =>
                      onChangeNewFilenameExtension(e.target.value)
                    }
                  >
                    {ALLOWED_STEP_EXTENSIONS.map((el) => {
                      const value = `.${el}`;
                      return (
                        <MenuItem key={value} value={value}>
                          {value}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label="Path in project"
                value={getFullProjectPath()}
                fullWidth
                margin="normal"
                disabled
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<CloseIcon />}
              color="secondary"
              onClick={onCloseCreateFileModal}
            >
              Cancel
            </Button>
            <Button
              startIcon={<AddIcon />}
              type="submit"
              form="create-file"
              data-test-id="project-file-picker-create-file"
            >
              Create file
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {state.cwd && state.tree && (
        <FilePicker
          tree={state.tree}
          cwd={state.cwd}
          onFocus={onFocus}
          value={props.value}
          icon={
            state.selectedFileExists ? (
              <CheckIcon color="success" />
            ) : (
              <WarningIcon color="warning" />
            )
          }
          helperText={
            state.selectedFileExists
              ? "File exists in the project directory."
              : "Warning: this file wasn't found in the project directory."
          }
          onCreateFile={onCreateFile}
          onChangeValue={onChangeFileValue}
          menuMaxWidth={props.menuMaxWidth}
        />
      )}
    </>
  );
};

export default ProjectFilePicker;
