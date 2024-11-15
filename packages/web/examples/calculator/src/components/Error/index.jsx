import { useEffect, useState } from "react";
import "./styles.css";
import { isEmpty } from "lodash";

const Error = ({errorMessage}) => {
    const [isErrorShown, setIsErrorShown] = useState(!isEmpty(errorMessage));

    useEffect(()=>{
        setIsErrorShown(!isEmpty(errorMessage))
    }, [errorMessage]);

    if (!isErrorShown) {
        return
    }

    return <div className="error">{errorMessage}</div>
}

export default Error;