import axiosInstance from "../utils/AxiosInstance";

export const reportAPI = {
    sendReport: (data: any) =>
        axiosInstance
            .post("/report/send_report", data)
            .then((res) => res.data),

    getAllAnnounce: (content: string) =>
        axiosInstance
            .post("/policy/get_all_policy_content", { content })
            .then(res => res.data),

    approveReport: (data: any) =>
        axiosInstance
            .put("/report/approve_report", data)
            .then(res => res.data),
};

