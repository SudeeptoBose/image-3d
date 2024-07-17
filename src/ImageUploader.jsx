import React, { useState, useRef } from 'react';

const ImageUploader = () => {
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setImage(file);

    if (file) {
      const blob = new Blob([file], { type: file.type });
      console.log('Image as blob:', blob);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      <button onClick={handleButtonClick}>Upload Image</button>
      {image && <p>Image uploaded: {image.name}</p>}
    </div>
  );
};

export default ImageUploader;