#!/usr/bin/env python
# coding: utf-8

# requirements
# !pip install ultralytics supervision

from ultralytics import YOLO
import supervision as sv
import cv2 as cv
import numpy as np
import matplotlib.pyplot as plt
import os
import requests

from collections import Counter
from collections import defaultdict

def image_prediction(image_path, confidence=0.5, model="./model.pt"):
    model = YOLO(model)
    class_dict = model.names
    img = cv.imread(image_path)
    if img is None:
        return {}

    result = model(img)[0]
    detections = sv.Detections.from_ultralytics(result)
    if detections.class_id is not None:
        detections = detections[(detections.confidence > confidence)]
        # Count each class_id
        class_ids = list(detections.class_id)
        species_names = [class_dict[cls_id] for cls_id in class_ids]
        species_count = dict(Counter(species_names))
        return species_count
    else:
        return {}


# ## Video Detection

def video_prediction(video_path, confidence=0.5, model="./model.pt"):
    """
    Returns {species: count} for birds detected in video
    """
    species_count = defaultdict(int)
    seen_tracker_ids = set()
    
    try:
        model = YOLO(model)
        tracker = sv.ByteTrack()
        class_dict = model.names

        cap = cv.VideoCapture(video_path)
        if not cap.isOpened():
            return {}

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            results = model(frame)[0]
            detections = sv.Detections.from_ultralytics(results)
            detections = tracker.update_with_detections(detections)
            
            if detections.class_id is not None:
                detections = detections[detections.confidence > confidence]
                
                # Track unique objects using tracker_id
                for cls_id, trk_id in zip(detections.class_id, detections.tracker_id):
                    if trk_id not in seen_tracker_ids:
                        species = class_dict[int(cls_id)]
                        species_count[species] += 1
                        seen_tracker_ids.add(trk_id)

        return dict(species_count)

    except Exception as e:
        print(f"Error: {e}")
        return {}
    
    finally:
        cap.release()
if __name__ == '__main__':
    print("predicting...")
    image_prediction("./test_images/crows_1.jpg", result_filename="crows_result1.jpg")
    image_prediction("./test_images/crows_3.jpg", result_filename='crows_detected_2.jpg')
    image_prediction("./test_images/kingfisher_2.jpg",result_filename='kingfishers_detected.jpg' )
    image_prediction("./test_images/myna_1.jpg",result_filename='myna_detected.jpg')
    image_prediction("./test_images/owl_2.jpg",result_filename='owls_detected.jpg')
    image_prediction("./test_images/peacocks_3.jpg",result_filename='peacocks_detected_1.jpg')
    image_prediction('./test_images/sparrow_3.jpg',result_filename='sparrow_detected_1.jpg')
    image_prediction('./test_images/sparrow_1.jpg',result_filename='sparrow_detected_2.jpg')

    # uncomment to test video prediction
    # video_prediction("./test_videos/crows.mp4",result_filename='crows_detected.mp4')
    # video_prediction("./test_videos/kingfisher.mp4",result_filename='kingfisher_detected.mp4')