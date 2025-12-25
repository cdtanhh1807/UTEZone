import './home.css';
import MiddleSide from './middleSide';
import RightSide from './rightSide';
import SearchSide from '../search/searchSide';
import { useLocation } from "react-router-dom";
import type { homedir } from 'os';

function Home() {

  const location = useLocation();
  const isSearching = location.pathname === "/search";

  return (
    <div className="Home">
      <div className="middleSide">
        {isSearching ? <SearchSide /> : <MiddleSide />}
      </div>

      <div className="rightSide">
        <RightSide />
      </div>
    </div>
  );
}

export default Home;
