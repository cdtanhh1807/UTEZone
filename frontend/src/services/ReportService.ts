import axiosInstance from "../utils/AxiosInstance";

export const reportAPI = {
    sendReport: (data: any) =>
        axiosInstance
        .post("/report/send_report", data)
        .then((res) => res.data),

    getAllAnnounce: () =>
        axiosInstance
        .get("/policy/get_all_policy")
        .then(res => res.data),   
    };
