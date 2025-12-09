import React from "react";
import "./middleSide.css";
import ListPost from "../profile/profilePost";
import StoryBlock from "../create/storyBlock";


const MiddleSide: React.FC = () => {

  return (
    <div className="middleHomeSide">
      <StoryBlock/>

      <ListPost/>
    </div>
  );

};

export default MiddleSide;