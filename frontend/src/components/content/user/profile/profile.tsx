// Profile.tsx
import { useParams } from "react-router-dom";
import ProfileHeader from "./profileHeader";
import ListPost from "./profilePost";

function Profile() {
  const { email } = useParams<{ email: string }>(); 

  return (
    <div className="Profile">
      <div className="header">
        <ProfileHeader email={email} /> 
      </div>
      <div className="post">
        <ListPost email={email} /> 
      </div>
    </div>
  );
}

export default Profile;
