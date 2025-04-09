"use client";

import { useState } from "react";
import {
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
  FileInput,
} from "./file-upload";
import { Paperclip } from "lucide-react";
import { Button } from "./ui/button";
import axios from "axios";
import Image from "next/image";

const FileSvgDraw = () => (
  <>
    <svg
      className="w-8 h-8 mb-3"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 20 16"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
      />
    </svg>
    <p className="mb-1 text-lg text-black">
      <span className="font-semibold">Click to upload</span>
      &nbsp; or drag and drop
    </p>
    <p className="text-sm">SVG, PNG, JPG, or GIF</p>
  </>
);

const FileUploaderTest = ({
  uploaded,
  setUploaded,
}: {
  setUploaded: React.Dispatch<React.SetStateAction<string[]>>;
  uploaded: string[];
}) => {
  const [files, setFiles] = useState<File[] | null>(null);
  const [uploading, setUploading] = useState(false);

  const dropZoneConfig = {
    maxFiles: 5,
    maxSize: 1024 * 1024 * 4,
    multiple: true,
  };

  async function onFileSelect(file: File) {
    setUploading(true);

    try {
      const res = await axios.get(
        "http://localhost:5000/v1/user/presignedUrl",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      console.log("Presigned URL Response:", res);

      if (res.status !== 200) {
        console.error("Failed to get presigned URL. Status:", res.status);
        return;
      }

      const { url, fields } = res.data;

      if (!url || !fields) {
        throw new Error(
          "Invalid presigned URL response: Missing 'url' or 'fields'.",
        );
      }

      const formData = new FormData();
      Object.keys(fields).forEach((key) => {
        formData.append(key, fields[key]);
      });
      formData.append("file", file);

      const uploadRes = await axios.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.status === 204) {
        console.log("File uploaded successfully!", uploadRes);
        setUploaded((prev) => [
          ...prev,
          `https://d23u46oquy85pk.cloudfront.net/${fields.key}`,
        ]);
      } else {
        console.error(`Unexpected response status: ${uploadRes.status}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
    }
  }

  const multipleFileSelect = (files: File[] | null) => {
    if (!files) return;
    files.forEach(onFileSelect);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {uploaded.length > 0 && (
        <div className="pb-4 ">
          <h3 className="text-lg font-semibold">Uploaded Files:</h3>
          <div className="grid grid-cols-3 gap-4 items-center justify-center">
            {uploaded.map((url, index) => (
              <Image
                key={index}
                src={url}
                alt={`Uploaded file ${index}`}
                width={300}
                height={300}
                className="rounded-lg w-auto h-auto"
              />
            ))}
          </div>
        </div>
      )}
      <div className="py-4">{uploading && <p>Uploading...</p>}</div>
      <FileUploader
        value={files}
        onValueChange={(selectedFiles) => multipleFileSelect(selectedFiles)}
        dropzoneOptions={dropZoneConfig}
        className="relative bg-background rounded-3xl p-2 shadow border h-full gradient-blue-2 text-black"
      >
        <FileInput className="outline-dashed outline-1 outline-white p-8 rounded-3xl">
          <div className="flex items-center justify-center flex-col pt-3 pb-4 w-full">
            <FileSvgDraw />
          </div>
        </FileInput>
        {/* <FileUploaderContent className="w-80">
          {files &&
            files.map((file, index) => (
              <FileUploaderItem key={index} index={index}>
                <Paperclip size={16} />
                <span>{file.name}</span>
              </FileUploaderItem>
            ))}
        </FileUploaderContent> */}
      </FileUploader>
    </div>
  );
};

export default FileUploaderTest;
