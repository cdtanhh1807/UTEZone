
import axiosInstance from "../utils/AxiosInstance";
import type { UserInfo } from "../types/Account";

export interface FollowBlockRequest {
  owner: string;
  client: string;
}

export interface FollowBlockResponse {
  message: boolean;
}

const AccountService = {
  get_account_info: (email?: string) =>
    axiosInstance
      .get("/account/account_info", {
        params: email ? { email: decodeURIComponent(email) } : {},
      })
      .then((res) => res.data),

  logout: (token: string) =>
    axiosInstance
      .post("/account/logout", null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          token_in: token,
        },
      })
      .then((res) => res.data),

  updateProfile: async (data: Partial<UserInfo>) => {
    const res = await axiosInstance.put("/account/update_account", data);
    return res.data;
  },

  follow: async (data: FollowBlockRequest): Promise<FollowBlockResponse> => {
    const res = await axiosInstance.put("/account/follow", data);
    return res.data;
  },

  un_follow: async (data: FollowBlockRequest): Promise<FollowBlockResponse> => {
    const res = await axiosInstance.put("/account/un_follow", data);
    return res.data;
  },

  block: async (data: FollowBlockRequest): Promise<FollowBlockResponse> => {
    const res = await axiosInstance.put("/account/block", data);
    return res.data;
  },

  un_block: async (data: FollowBlockRequest): Promise<FollowBlockResponse> => {
    const res = await axiosInstance.put("/account/un_block", data);
    return res.data;
  },
};

export default AccountService;
