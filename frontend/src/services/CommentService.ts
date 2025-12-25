import axiosInstance from "../utils/AxiosInstance";

export interface UpdateCommentStatusRequest {
  commentId: string;
  statusComment: string;
}

export interface UpdatePostResponse {
  post: any;
}


const CommentService = {
  addComment: (data: { postId: string; content: string }) =>
    axiosInstance.post("/comment/add_comment", data).then((res) => res.data),

  getByPostId: (postId: string) =>
    axiosInstance
      .get(`/comment/get_by_post/${postId}`)
      .then((res) => res.data),

  updateCommentReact: (
    id: string,
    comment_id: string,
    react_type: string
  ) =>
    axiosInstance
      .put(`/comment/${id}/comments/${comment_id}/react/${react_type}`)
      .then((res) => res.data),

  // ===== NEW METHOD =====
  updateCommentStatus: (
    postId: string,
    data: UpdateCommentStatusRequest
  ): Promise<UpdatePostResponse> =>
    axiosInstance
      .put(`/post/update_comment/${postId}`, data)
      .then((res) => res.data),
};

export default CommentService;
