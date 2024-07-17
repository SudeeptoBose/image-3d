import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Client } from '@gradio/client';
import * as THREE from 'three';

const Trippy = () => {
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [processedImageUrl, setProcessedImageUrl] = useState(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
    const fileInputRef = useRef(null);

    const handleButtonClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        setImage(file);

        if (file) {
            const blob = new Blob([file], { type: file.type });
            console.log('Image as blob:', blob);

            const url = URL.createObjectURL(file);
            setImageUrl(url);

            try {
                const checkedImage = await checkImage(blob);
                console.log(checkedImage);

                const preprocessedImageUrl = await preprocessImage(blob);
                setProcessedImageUrl(preprocessedImageUrl);

                const preprocessedBlob = await fetchImageAsBlob(preprocessedImageUrl);
                const generatedImageUrl = await generateImage(preprocessedBlob);

                console.log('Generated image:', generatedImageUrl);

                if (generatedImageUrl) {
                    setGeneratedImageUrl(generatedImageUrl);
                } else {
                    console.error('Unexpected result format:', generatedImageUrl);
                }
            } catch (error) {
                console.error('Error processing image:', error);
            }
        }
    };

    const checkImage = async (blob) => {
        try {
            const app = await Client.connect("stabilityai/TripoSR");
            const result = await app.predict("/check_input_image", [blob]);
            if (result.data) {
                return result;
            } else {
                throw new Error('Invalid check image result');
            }
        } catch (error) {
            console.error('Error checking image:', error);
            throw error;
        }
    };

    const preprocessImage = async (blob) => {
        try {
            const app = await Client.connect("stabilityai/TripoSR");
            const result = await app.predict("/preprocess", [
                blob,
                true,
                0.5
            ]);
            if (result.data && result.data[0] && result.data[0].url) {
                return result.data[0].url;
            } else {
                throw new Error('Invalid preprocess image result');
            }
        } catch (error) {
            console.error('Error preprocessing image:', error);
            throw error;
        }
    };

    const generateImage = async (blob) => {
        try {
            const app = await Client.connect("stabilityai/TripoSR");
            const result = await app.predict("/generate", [blob, 32]);
            if (result) {
                console.log('gen mod', result)
                return result.data[1].url;
            } else {
                throw new Error('Invalid generate image result');
            }
        } catch (error) {
            console.error('Error generating image:', error);
            throw error;
        }
    };

    const fetchImageAsBlob = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.blob();
        } catch (error) {
            console.error('Error fetching image as blob:', error);
            throw error;
        }
    };

    const Model = ({ url }) => {
        const group = useRef();
        const { nodes, materials } = useGLTF(url);
      
        // Convert original materials to MeshStandardMaterial
        const standardMaterials = useMemo(() => {
          const newMaterials = {};
          Object.entries(materials).forEach(([key, mat]) => {
            const standardMat = new THREE.MeshStandardMaterial();
            
            // Copy common properties
            standardMat.color.copy(mat.color || new THREE.Color(0xffffff));
            standardMat.roughness = mat.roughness !== undefined ? mat.roughness : 0.5;
            standardMat.metalness = mat.metalness !== undefined ? mat.metalness : 0.5;
            
            // Copy textures if they exist
            if (mat.map) standardMat.map = mat.map;
            if (mat.normalMap) standardMat.normalMap = mat.normalMap;
            if (mat.roughnessMap) standardMat.roughnessMap = mat.roughnessMap;
            if (mat.metalnessMap) standardMat.metalnessMap = mat.metalnessMap;
            if (mat.aoMap) standardMat.aoMap = mat.aoMap;
            if (mat.emissiveMap) standardMat.emissiveMap = mat.emissiveMap;
      
            // Copy other relevant properties
            if (mat.emissive) standardMat.emissive.copy(mat.emissive);
            if (mat.emissiveIntensity) standardMat.emissiveIntensity = mat.emissiveIntensity;
      
            newMaterials[key] = standardMat;
          });
          return newMaterials;
        }, [materials]);
      
        useFrame((state, delta) => {
          if (group.current) {
            group.current.rotation.y += delta * 0.5; // Rotate the model
          }
        });
    
        return (
          <group ref={group}>
            {Object.keys(nodes).map((key) => {
              const node = nodes[key];
              if (node.isMesh) {
                return (
                  <mesh
                    key={key}
                    geometry={node.geometry}
                    material={standardMaterials[node.material.name]}
                  />
                );
              }
              return null;
            })}
          </group>
        );
      };
      

    useEffect(() => {
        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
            if (processedImageUrl && processedImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(processedImageUrl);
            }
        };
    }, [imageUrl, processedImageUrl]);

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
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {imageUrl && (
                    <div>
                        <h3>Original Image:</h3>
                        <img src={imageUrl} alt="Original" style={{ maxWidth: '45%', maxHeight: '400px' }} />
                    </div>
                )}
                {processedImageUrl && (
                    <div>
                        <h3>Processed Image:</h3>
                        <img src={processedImageUrl} alt="Processed" style={{ maxWidth: '45%', maxHeight: '400px' }} />
                    </div>
                )}
                {generatedImageUrl && (
                    <Canvas style={{ width: '400px', height: '400px' }}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} />
                        <Model url={generatedImageUrl} />
                        <OrbitControls />
                    </Canvas>
                )}
            </div>
        </div>
    );
};

export default Trippy;