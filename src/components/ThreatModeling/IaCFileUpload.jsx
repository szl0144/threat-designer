import React from "react";
import FileUpload from "@cloudscape-design/components/file-upload";

export default function IaCFileUpload({ onFileChange, value, setValue, error, setError }) {
  const handleFileChange = async ({ detail }) => {
    setError(false);
    setValue(detail.value);

    if (detail.value.length > 0) {
      const file = detail.value[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target.result;
        onFileChange({
          type: detail.value[0].type,
          content: content,
          name: detail.value[0].name,
        });
      };

      reader.onerror = (error) => {
        console.error("Error reading file:", error);
      };

      reader.readAsText(file);
    } else {
      onFileChange(null);
    }
  };

  return (
    <FileUpload
      accept=".tf,.tfvars,.yaml,.yml,.json"
      onChange={handleFileChange}
      value={value}
      i18nStrings={{
        uploadButtonText: (e) => (e ? "Choose files" : "Choose file"),
        dropzoneText: (e) => (e ? "Drop files to upload" : "Drop file to upload"),
        removeFileAriaLabel: (e) => `Remove file ${e + 1}`,
        limitShowFewer: "Show fewer files",
        limitShowMore: "Show more files",
        errorIconAriaLabel: "Error",
      }}
      showFileLastModified
      showFileSize
      tokenLimit={1}
      errorText={error && "Invalid file format. Please upload a valid IaC file (Terraform, CloudFormation, or OpenAPI)"}
    />
  );
} 